import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import City from './City';
import User from './User';
import DailyRedactorStats from './DailyRedactorStats';
import Image from './Image';

class Place extends Model {
    // Champs existants
    public id_tomexplore!: number; // Gardé comme identifiant principal
    public name_eng!: string;
    public name_original?: string;
    public type!: string;
    public city_id!: number;
    public checked!: boolean;
    public folder!: string;
    public needs_attention?: Boolean;
    public to_be_deleted?: Boolean;
    public details?: string;
    public has_needed_attention?: boolean;
    public photos_deleted?: boolean;
    
    // Champs temporels renommés ou existants
    public updated!: Date; // Renommé de last_modification
    public timestamp_start?: Date;
    public timestamp_end?: Date;
    
    // Champs pour la gestion des rédacteurs
    public redactor_id?: number;
    
    // ===== NOUVEAUX CHAMPS =====
    
    // Identifiants et informations de base
    public slug?: string;
    
    // Liens externes renommés
    public link_insta?: string; // Renommé de instagram_link
    public link_maps?: string; // Renommé de google_maps_link
    
    // Liens externes existants
    public wikipedia_link?: string;
    public unsplash_link?: string;
    
    // Nouveaux liens externes
    public link_fb?: string;
    public link_website?: string;
    public link_linkedin?: string;
    
    // Informations Google
    public google_id?: string;
    public google_place_id?: string;
    public reviews_google_rating?: number;
    public reviews_google_count?: number;
    
    // Descriptions et métadonnées
    public description_scrapio?: string;
    public meta_title_scrapio?: string; 
    public meta_description_scrapio?: string;
    
    // Informations de contact
    public mails?: string[];
    public phone?: string;
    
    // Localisation
    public lat?: number;
    public lng?: number;
    public address?: string;
    public zip_code?: string;
    public city_address?: string;
    public district?: string;
    
    // Statut et metadata
    public instagram_updated?: boolean;
    public created?: Date;
    public scraped?: Date;
    public last_api_scraped?: Date;
    public verified?: boolean;
    public public?: boolean;
    public price_range?: string;
    public duration?: number;
    public is_closed?: boolean;
    public set_in_queue?: boolean;
    public imgs_scraped?: boolean;
    
    // Évaluation et avis
    public reviews_user_rating?: number;
    public reviews_user_count?: number;
    public reviews_average_rating?: number;
    public reviews_average_count?: number;

    // Getters/setters de compatibilité
    get instagram_link(): string | undefined {
        return this.link_insta;
    }

    set instagram_link(value: string | undefined) {
        this.link_insta = value;
    }

    get google_maps_link(): string | undefined {
        return this.link_maps;
    }

    set google_maps_link(value: string | undefined) {
        this.link_maps = value;
    }

    get last_modification(): Date {
        return this.updated;
    }

    set last_modification(value: Date) {
        this.updated = value;
    }
}

Place.init({
    // Champs existants
    id_tomexplore: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name_eng: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name_original: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    city_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: City,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    checked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    needs_attention: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    to_be_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    instagram_updated: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    folder: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.TEXT // Changé à TEXT pour supporter de plus longs contenus
    },
    
    // Champs renommés
    updated: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'last_modification' // Garde le nom de colonne en base de données
    },
    
    // Anciens champs de liens (pour compatibilité)
    wikipedia_link: {
        type: DataTypes.STRING
    },
    unsplash_link: {
        type: DataTypes.STRING
    },
    google_maps_link: { // Gardé pour compatibilité
        type: DataTypes.STRING
    },
    instagram_link: { // Gardé pour compatibilité
        type: DataTypes.STRING
    },
    
    // Gestion rédaction
    timestamp_start: {
        type: DataTypes.DATE,
        allowNull: true
    },
    timestamp_end: {
        type: DataTypes.DATE,
        allowNull: true
    },
    redactor_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    has_needed_attention: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    photos_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    
    // ===== NOUVEAUX CHAMPS =====
    
    // Identification
    slug: {
        type: DataTypes.STRING,
        allowNull: true
    },
    
    // Google
    google_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    google_place_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    
    // Descriptions
    description_scrapio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    meta_title_scrapio: {
        type: DataTypes.STRING(500), // Texte plus long
        allowNull: true
    },
    meta_description_scrapio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // Liens externes
    link_insta: {
        type: DataTypes.STRING,
        allowNull: true
    },
    link_fb: {
        type: DataTypes.STRING,
        allowNull: true
    },
    link_maps: {
        type: DataTypes.STRING(1000), // URL Google Maps peut être longue
        allowNull: true
    },
    link_website: {
        type: DataTypes.STRING,
        allowNull: true
    },
    link_linkedin: {
        type: DataTypes.STRING,
        allowNull: true
    },
    
    // Contact
    mails: {
        type: DataTypes.JSON, // Pour stocker un tableau d'emails
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    
    // Localisation
    lat: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    lng: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    zip_code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    city_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    district: {
        type: DataTypes.STRING,
        allowNull: true
    },
    
    // Dates et statuts
    created: {
        type: DataTypes.DATE,
        allowNull: true
    },
    scraped: {
        type: DataTypes.DATE,
        allowNull: true
    },
    last_api_scraped: {
        type: DataTypes.DATE,
        allowNull: true
    },
    verified: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    public: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true
    },
    is_closed: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    set_in_queue: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    imgs_scraped: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    
    // Prix et durée
    price_range: {
        type: DataTypes.STRING,
        allowNull: true
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    // Avis
    reviews_google_rating: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    reviews_google_count: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    reviews_user_rating: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    reviews_user_count: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    reviews_average_rating: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    reviews_average_count: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Place',
    tableName: 'places',
    timestamps: false,
    underscored: true // Pour les noms de colonnes en snake_case
});

// Hooks inchangés
Place.afterUpdate(async (place, options) => {
    if (place.timestamp_end && place.timestamp_start && place.redactor_id) {
        const redactorId = place.redactor_id;
        const startTime = new Date(place.timestamp_start).getTime();
        const endTime = new Date(place.timestamp_end).getTime();
        const timeSpent = (endTime - startTime) / 1000;

        // Mise à jour des statistiques de l'utilisateur
        const user = await User.findByPk(redactorId);
        if (user) {
            if (place.needs_attention) {
                user.places_needing_att_checked += 1;
            }
            user.total_places += 1;
            user.total_time_spent += timeSpent;
            user.avg_time_per_place = user.total_time_spent / user.total_places;
            await user.save();
        }

        const today = new Date().toISOString().slice(0, 10);
        const dailyStats = await DailyRedactorStats.findOne({ where: { redactor_id: redactorId, day: today } });

        if (dailyStats) {
            if (place.needs_attention) {
                dailyStats.places_needing_att += 1;
            }
            dailyStats.total_places += 1;
            dailyStats.total_time_spent += timeSpent;
            dailyStats.avg_time_per_place = dailyStats.total_time_spent / dailyStats.total_places;
            await dailyStats.save();
        } else {
            await DailyRedactorStats.create({
                redactor_id: redactorId,
                day: today,
                places_needing_att: place.needs_attention ? 1 : 0,
                total_places: 1,
                total_time_spent: timeSpent,
                avg_time_per_place: timeSpent,
            });
        }

        if (place.needs_attention) {
            place.needs_attention = false;
            await place.save({ hooks: false }); // Désactiver les hooks pour éviter une boucle infinie
        }
    }
});

// Interface inchangée - sera définie dans index.ts maintenant
export interface PlaceWithImages extends Place {
    images: Image[];
}

export default Place;
