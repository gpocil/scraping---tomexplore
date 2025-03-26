import { Request, Response } from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import * as ProxyController from '../ProxyController';

puppeteer.use(StealthPlugin());

/**
 * Récupère les événements du site infolocale.fr pour une ville spécifique
 */
export async function fetchInfolocaleEvents(req?: Request, res?: Response): Promise<any> {
  const { city, dateStart, dateEnd } = req ? req.body : { city: '', dateStart: '', dateEnd: '' };
  
  if (!city) {
    const error = 'Le paramètre city est requis';
    console.error(error);
    if (res) {
      res.status(400).json({ error });
    }
    return { events: [], count: 0, error };
  }

  console.log(`Recherche d'événements pour: ${city}, du ${dateStart || 'aujourd\'hui'} au ${dateEnd || 'non spécifié'}`);

  let browser: Browser | null = null;
  try {
    // Utiliser un proxy aléatoire
    const proxy = ProxyController.getRandomProxy();
    console.log(`Utilisation du proxy: ${proxy.address}`);

    // Lancer le navigateur avec le proxy
    browser = await puppeteer.launch({
      headless: false, // Conserver headless: false pendant le développement
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1280,800', // Taille de fenêtre plus standard
        `--proxy-server=${proxy.address}`,
      ],
    });

    const page = await browser.newPage();
    
    // Définir les en-têtes pour simuler un navigateur réel
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Naviguer vers la page d'accueil des événements
    console.log("Navigation vers la page d'accueil des événements...");
    await page.goto('https://www.infolocale.fr', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Gérer le consentement aux cookies si nécessaire
    await handleCookieConsent(page);
    
    // Effectuer la recherche par ville
    console.log(`Recherche de la ville: ${city}...`);
    await searchForCity(page, city);
    
    // Si des dates sont spécifiées, filtrer par dates
    if (dateStart || dateEnd) {
      console.log("Filtrage par dates...");
      await filterByDates(page, dateStart, dateEnd);
    }
    
    // Attendre que les événements soient chargés
    await page.waitForSelector('memo-hit', { timeout: 10000 }).catch(() => {
      console.log('Aucun événement trouvé ou structure de page différente');
    });

    // Extraire les données
    const data = await extractInfolocaleData(page);
    console.log(`${data.events.length} événements extraits`);

    // Vérifier que des événements ont été trouvés
    if (data.events.length === 0) {
      const error = `Aucun événement trouvé pour ${city}`;
      console.error(error);
      if (res) {
        res.status(404).json({ success: false, message: error });
      }
      return { events: [], count: 0, error, source: 'Infolocale' };
    }

    // Répondre si un objet response est fourni
    if (res) {
      res.status(200).json({
        success: true,
        eventsCount: data.events.length,
        events: data.events
      });
    }

    // Retourner le résultat au format attendu
    return {
      events: data.events,
      count: data.events.length,
      source: 'Infolocale'
    };

  } catch (error: any) {
    const errorMsg = `Erreur lors de l'extraction des événements: ${error.message}`;
    console.error(errorMsg);
    if (res) {
      res.status(500).json({
        error: 'Erreur lors de l\'extraction des événements',
        message: error.message
      });
    }
    return { events: [], count: 0, error: errorMsg, source: 'Infolocale' };
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navigateur fermé');
    }
  }
}

/**
 * Effectue une recherche de ville dans le champ de recherche
 */
async function searchForCity(page: Page, city: string): Promise<void> {
  try {
    console.log(`URL avant recherche: ${await page.url()}`);
    
    // Attendre que le champ de recherche soit disponible
    await page.waitForSelector('#search-location', { timeout: 5000 });
    
    // Cliquer sur le champ pour le faire apparaître si nécessaire
    await page.click('#search-location');
    
    // Effacer le contenu du champ s'il y en a
    await page.evaluate(() => {
      const input = document.querySelector('#search-location') as HTMLInputElement;
      if (input) input.value = '';
    });
    
    // Saisir la ville
    await page.type('#search-location', city, { delay: 100 });
    console.log(`Ville "${city}" saisie dans le champ de recherche`);
    
    // Attendre un court instant pour que la liste de suggestions apparaisse
    await page.waitForTimeout(1000);
    
    // Appuyer sur Entrée pour soumettre la recherche
    await page.keyboard.press('Enter');
    console.log('Recherche soumise');
    
    // Attendre que la page se charge
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
      console.log('Navigation non détectée, vérification des résultats de recherche');
    });
    
    // Après la navigation
    await page.waitForTimeout(3000); // Attendre un peu plus pour être sûr
    const finalUrl = await page.url();
    const pageTitle = await page.title();
    console.log(`URL après recherche: ${finalUrl}`);
    console.log(`Titre de la page: ${pageTitle}`);
    console.log(`HTML visible: ${await page.content().then(html => html.substring(0, 200) + '...')}`);
    
    // Capture d'écran pour déboguer
    await page.screenshot({ path: 'debug-search-result.png', fullPage: true });
    
  } catch (error) {
    console.error(`Erreur lors de la recherche de ville: ${error}`);
    throw error;
  }
}

/**
 * Filtre les résultats par date
 */
async function filterByDates(page: Page, dateStart?: string, dateEnd?: string): Promise<void> {
  try {
    // Rechercher le bouton de filtre par date
    const dateFilterSelector = 'button.filter-button';
    await page.waitForSelector(dateFilterSelector, { timeout: 5000 });
    
    // Cliquer sur le bouton de filtre
    await page.click(dateFilterSelector);
    console.log("Ouverture du filtre de dates");
    
    // Attendre que le formulaire de filtrage s'affiche
    await page.waitForSelector('.date-filter-form', { timeout: 5000 });
    
    // Si une date de début est spécifiée
    if (dateStart) {
      const formattedStartDate = formatDate(dateStart);
      console.log(`Définition de la date de début: ${formattedStartDate}`);
      
      // Trouver et remplir le champ de date de début
      await page.type('input[name="date_debut"]', formattedStartDate, { delay: 100 });
    }
    
    // Si une date de fin est spécifiée
    if (dateEnd) {
      const formattedEndDate = formatDate(dateEnd);
      console.log(`Définition de la date de fin: ${formattedEndDate}`);
      
      // Trouver et remplir le champ de date de fin
      await page.type('input[name="date_fin"]', formattedEndDate, { delay: 100 });
    }
    
    // Soumettre le formulaire de filtre
    await page.click('button[type="submit"]');
    console.log("Filtre de dates appliqué");
    
    // Attendre que la page se recharge avec les résultats filtrés
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
      console.log('Navigation non détectée après filtrage par date');
    });
    
  } catch (error) {
    console.error(`Erreur lors du filtrage par dates: ${error}`);
    // Ne pas arrêter le processus si le filtrage échoue
    console.log("Poursuite du scraping sans filtre de dates");
  }
}

/**
 * Construit l'URL de recherche pour infolocale.fr
 */
function buildSearchUrl(city: string, dateStart?: string, dateEnd?: string): string {
  const baseUrl = 'https://www.infolocale.fr/recherche';
  
  let params = new URLSearchParams();
  params.append('ville', city);
  
  if (dateStart) {
    params.append('date_debut', formatDate(dateStart));
  }
  
  if (dateEnd) {
    params.append('date_fin', formatDate(dateEnd));
  }
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Formate une date pour l'URL
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  } catch (e) {
    console.log('Format de date invalide, utilisation de la date actuelle');
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  }
}

/**
 * Gère le consentement aux cookies si nécessaire
 */
async function handleCookieConsent(page: Page): Promise<void> {
  try {
    // Attendre le bandeau de cookies pendant un court instant
    const cookieButton = await page.$('button#didomi-notice-agree-button');
    if (cookieButton) {
      console.log('Bandeau de cookie détecté, acceptation des cookies...');
      await cookieButton.click();
      await page.waitForTimeout(1000);
    }
  } catch (error) {
    console.log('Pas de bandeau de cookies ou impossible de le traiter');
  }
}

/**
 * Extrait les données d'événements de la page
 */
async function extractInfolocaleData(page: Page): Promise<{ events: any[] }> {
  await autoScroll(page);
  
  return await page.evaluate(() => {
    const events: any[] = [];
    const eventCards = document.querySelectorAll('memo-hit .memo-card');
    
    eventCards.forEach(card => {
      try {
        // Extraire le titre
        const titleElement = card.querySelector('h2.card-title');
        const title = titleElement ? (titleElement as HTMLElement).innerText.trim() : 'Sans titre';
        
        // Extraire les dates de début et de fin
        const datesContainer = card.querySelector('.card-dates');
        let startDate = 'Date inconnue';
        let endDate = 'Date inconnue';
        
        if (datesContainer) {
          const dayLabels = datesContainer.querySelectorAll('label.day');
          
          if (dayLabels.length >= 1) {
            startDate = (dayLabels[0] as HTMLElement).innerText.trim();
          }
          
          if (dayLabels.length >= 2) {
            endDate = (dayLabels[1] as HTMLElement).innerText.trim();
          }
        }
        
        // Extraire la description
        const descriptionElement = card.querySelector('.card-description');
        const description = descriptionElement ? (descriptionElement as HTMLElement).innerText.trim() : '';
        
        // Extraire la localisation
        const locationElement = card.querySelector('.location');
        const location = locationElement ? (locationElement as HTMLElement).innerText.trim() : 'Lieu inconnu';
        
        // Extraire le type d'événement
        const typeElement = card.querySelector('.card-text');
        const eventType = typeElement ? (typeElement as HTMLElement).innerText.trim() : '';
        
        // Extraire l'URL de détail de l'événement
        const linkElement = card.querySelector('a.card-link');
        const url = linkElement ? linkElement.getAttribute('href') : '';
        
        // Extraire l'image
        const imageElement = card.querySelector('img.card-img');
        const imageUrl = imageElement ? imageElement.getAttribute('src') : '';
        
        events.push({
          title,
          startDate,
          endDate,
          description,
          location,
          type: eventType,
          url,
          imageUrl
        });
      } catch (err: any) {
        console.log(`Erreur lors de l'extraction d'un événement`);
      }
    });
    
    return { events };
  });
}

/**
 * Fait défiler la page pour charger tous les événements
 */
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  
  // Attendre un court instant pour que le contenu se charge
  await page.waitForTimeout(2000);
}