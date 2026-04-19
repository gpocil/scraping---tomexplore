# Plan — Migration Option B : champ dédié `source_category` pour les images

## Contexte

L'Option A (implémentée) stocke la sous-catégorie Google (By owner / All) dans `Image.original_url` sous la forme `Google/By owner` ou `Google/All`.

Cela fonctionne mais mélange la source principale et le sous-détail dans un champ texte libre. Cette option B propose d'extraire cette information dans un champ structuré pour permettre des requêtes propres, du filtrage, et de l'analytics.

## Objectif

Permettre :
- Requêtes SQL directes : `SELECT * FROM Images WHERE source_category = 'By owner'`
- Filtrage/tri frontend (page review) : afficher d'abord les images "By owner"
- Marquage auto `needs_attention` pour les images tierces ("All")
- Rapport légal CSV par source/catégorie
- Extensibilité aux autres sources (Wikimedia CC-BY / CC-BY-SA, Unsplash, Instagram, etc.)

## Changement DB

### Migration SQL

```sql
ALTER TABLE Images
  ADD COLUMN source_category VARCHAR(50) NULL
  AFTER original_url;

-- Optionnel : index si on filtre souvent dessus
CREATE INDEX idx_images_source_category ON Images(source_category);

-- Backfill : migration des données existantes stockées dans original_url
UPDATE Images
SET source_category = 'By owner',
    original_url    = 'Google'
WHERE original_url = 'Google/By owner';

UPDATE Images
SET source_category = 'All',
    original_url    = 'Google'
WHERE original_url = 'Google/All';
```

### Modèle Sequelize (`src/models/Image.ts`)

```ts
class Image extends Model {
    public id!: number;
    public image_name!: string;
    public original_url?: string;
    public source_category?: string;   // NEW
    public place_id!: number;
    public top?: number;
    public author?: string;
    public license?: string;
}

Image.init({
    // ... champs existants ...
    source_category: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    // ... reste inchangé ...
});
```

## Changements code

### 1. `GoogleController.ts`

Déjà prêt depuis l'Option A : `fetchGoogleImgsFromBusinessPage()` retourne déjà `{ urls, count, category, error }`. Aucun changement.

### 2. `ScrapingMainController.ts`

Revenir sur les 3 spots modifiés par l'Option A pour séparer `original_url` et `source_category` :

**`getPhotosBusiness()` — création des images** :
```ts
await Promise.all(
    result.imageNames.map((generatedName, index) => {
        const isInstagram = index < instagramImages.urls.length;
        return Image.create({
            image_name: generatedName,
            original_url: isInstagram ? 'Instagram' : 'Google',
            source_category: isInstagram ? null : googleImages.category || null,
            place_id: place.id_tomexplore
        }, { transaction });
    })
);
```

**`getPhotosTouristAttraction()`** — même logique, mais avec 4 sources : propager `category` depuis `googleRaw` jusqu'à la création d'image (passer par `FileController.downloadPhotosTouristAttraction` qui aujourd'hui stocke la source par image — ajouter un champ `category` sur l'objet intermédiaire).

**`scrapeGoogleMapsAfterUpdate()`** :
```ts
await Promise.all(
    result.imageNames.map((generatedName) => {
        return Image.create({
            image_name: generatedName,
            original_url: 'Google',
            source_category: googleMapsImages.category || null,
            place_id: place!.id_tomexplore
        });
    })
);
```

### 3. `FileController.ts`

La fonction `downloadPhotosTouristAttraction()` renvoie actuellement pour chaque image `{ filename, source, author, license }`. Ajouter `category?: string` à cette structure et la propager depuis les inputs.

### 4. Frontend (page review)

- Ajouter un badge visuel par image :
  - 🟢 **Owner** → `source_category = 'By owner'`
  - 🟡 **Third-party** → `source_category = 'All'`
  - ⚪ neutre si null/autre
- Endpoint `/api/front` qui liste les images doit inclure `source_category` dans la réponse JSON.
- Option : trier les images par priorité (Owner d'abord).

## Étendre aux autres sources (hors scope Option B initial mais à prévoir)

Table de correspondance cible :

| Source principale (`original_url`) | `source_category` exemples |
|---|---|
| Google | `By owner`, `All`, `Street View` |
| Wikimedia | `CC-BY`, `CC-BY-SA`, `CC0`, `Public Domain` |
| Unsplash | `Unsplash License` (toujours même) |
| Instagram | `Public account` |

Quand on étend, le champ `license` existant peut devenir redondant avec `source_category` pour certaines sources. À arbitrer : soit on réserve `license` aux codes juridiques stricts (CC-BY-SA) et `source_category` à la catégorie de collecte (By owner / All), soit on fusionne.

## Ordre de bataille

1. Créer migration SQL (fichier `migrations/YYYYMMDD_add_source_category.sql`).
2. Ajouter `source_category` au modèle Sequelize.
3. Lancer la migration en dev + backfill.
4. MAJ `GoogleController` return type : enlever `category` du `original_url` string, garder comme champ séparé.
5. MAJ `ScrapingMainController` (3 spots) + `FileController.downloadPhotosTouristAttraction`.
6. MAJ endpoint `/api/front` pour exposer `source_category`.
7. MAJ frontend review : badge + tri.
8. Tester : re-scraper 2-3 lieux, vérifier DB + UI.
9. Rollback plan : migration réversible (`DROP COLUMN source_category`), `original_url` reste la source de vérité.

## Rollback

Si problème après déploiement :
```sql
ALTER TABLE Images DROP COLUMN source_category;
-- L'Option A reste fonctionnelle : original_url = 'Google/By owner' | 'Google/All'
```

Code : revert des commits côté `ScrapingMainController` + `Image` model.

## Estimation

- Dev backend : ~2h (migration + modèle + 3 spots + tests)
- Dev frontend : ~1-2h (badge + tri + appel API)
- Tests manuels : ~1h (quelques lieux, cas "By owner" présent / absent / both)

**Total : ~½ journée**
