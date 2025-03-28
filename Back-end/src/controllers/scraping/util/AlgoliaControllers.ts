import { Request, Response } from 'express';
import axios from 'axios';
import { Op, Transaction } from 'sequelize';
import sequelize from '../../../sequelize';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

// Extend the Window interface to include algoliaConf
declare global {
  interface Window {
    algoliaConf?: { [key: string]: any };
  }
}
import * as ProxyController from '../ProxyController';

import City from '../../../models/City';
import Country from '../../../models/Country';
import Event from '../../../models/Event';
import Image from '../../../models/Image';
import Place from '../../../models/Place';

puppeteer.use(StealthPlugin());

// Configuration Algolia
const ALGOLIA_API_URL = 'https://e35vbjot1f-2.algolianet.com/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.13.0)%3B%20Browser%20(lite)%3B%20instantsearch.js%20(4.40.3)%3B%20JS%20Helper%20(3.8.2)&x-algolia-api-key={Clé API}%3D%3D&x-algolia-application-id=E35VBJOT1F'; 

// Rayon de recherche en km autour de la ville
const DEFAULT_SEARCH_RADIUS = 20;

/**
 * Recherche d'événements par ville avec Algolia
 */
export async function fetchEventsByCity(req: Request, res: Response): Promise<void> {
  try {
    const startTime = Date.now();
    const { cityName, radius = DEFAULT_SEARCH_RADIUS } = req.body;
    
    if (!cityName) {
      res.status(400).json({ error: 'Le nom de la ville est requis' });
      return;
    }
    
    console.log(`[${new Date().toISOString()}] Recherche d'événements pour la ville: ${cityName} (rayon: ${radius}km)`);
    
    // 1. Rechercher la ville dans la BDD pour obtenir ses coordonnées
    const city = await findCityByName(cityName);
    
    if (!city) {
      res.status(404).json({ 
        error: `La ville "${cityName}" n'a pas été trouvée dans la base de données` 
      });
      return;
    }
    
    console.log(`Ville trouvée: ${city.name} (ID: ${city.id}) avec coordonnées [${city.latitude}, ${city.longitude}]`);
    
    // 2. Calculer les limites géographiques (bounding box)
    const { northEast, southWest } = calculateBoundingBox(
      city.latitude, 
      city.longitude, 
      Number(radius)
    );
    
    // 3. Scrap de la clé API Algolia
    const browser = await puppeteer.launch({
      headless: "new", // Mode headless pour plus de performance
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true
    });

    let apiKey = '';
    try {
      console.log("Ouverture du navigateur pour récupérer la clé API Algolia...");
      const page = await browser.newPage();
      
      // Masquer les traces de bot
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      
      // URL CORRIGÉE - page des événements (et non la racine)
      await page.goto('https://www.infolocale.fr/evenements', { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Attendre que le script contenant la configuration Algolia soit chargé
      await page.waitForFunction(() => window.algoliaConf && window.algoliaConf["IL"], { timeout: 30000 });
      
      // Extraire la clé API depuis le script
      apiKey = await page.evaluate(() => {
        if (typeof window.algoliaConf !== 'undefined' && window.algoliaConf["IL"]) {
          return window.algoliaConf["IL"].key;
        }
        return '';
      });
      
      console.log(`Clé API Algolia récupérée: ${apiKey.substring(0, 15)}...`);
      
    } catch (error) {
      console.error("Erreur lors de l'extraction de la clé API:", error);
      
      // FALLBACK: utiliser une clé statique en cas d'échec du scraping
      apiKey = "OGVjZGU1Mzg5MDNmYzhkZjczZDE4ZTQ5ZjgzYTgwY2ZiYzk1YTQwYTFkNmIyYTA1NTc2N2ZmYWVhODk5NDM3MXZhbGlkVW50aWw9MTc0MzA4NTYzNA==";
      console.log("Utilisation de la clé API de secours");
    } finally {
      // Fermer le navigateur
      await browser.close();
      console.log("Navigateur fermé");
    }
    
    if (!apiKey) {
      throw new Error("La clé API Algolia n'a pas été trouvée");
    }
    
    // Construction de l'URL Algolia avec la clé récupérée
    const algoliaUrl = `https://e35vbjot1f-2.algolianet.com/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.13.0)%3B%20Browser%20(lite)%3B%20instantsearch.js%20(4.40.3)%3B%20JS%20Helper%20(3.8.2)&x-algolia-api-key=${apiKey}&x-algolia-application-id=E35VBJOT1F`;
    
    // 3. Requête à l'API Algolia avec l'URL dynamique
    const events = await searchAlgoliaEvents(northEast, southWest, algoliaUrl);
    console.log(`${events.length} événements trouvés via Algolia`);
    
    // 4. Sauvegarder les événements dans la BDD
    const savedResults = await saveEventsToDB(events, city);
    
    const executionTime = (Date.now() - startTime) / 1000;
    
    // 5. Réponse au client
    res.status(200).json({
      success: true,
      executionTime: `${executionTime} secondes`,
      city: {
        id: city.id,
        name: city.name,
        country: city.country ? city.country.name : null,
        coordinates: {
          latitude: city.latitude,
          longitude: city.longitude
        }
      },
      searchArea: {
        northEast,
        southWest,
        radiusKm: radius
      },
      results: {
        total: events.length,
        saved: savedResults.savedCount,
        events: savedResults.savedEvents.map(event => ({
          id: event.id,
          name: event.name,
          date_start: event.event_date_start,
          date_end: event.event_date_end,
          type: event.event_type
        }))
      }
    });
    
  } catch (error: any) {
    console.error('Erreur lors de la recherche d événements:', error);
    res.status(500).json({
      error: 'Erreur lors de la recherche d événements',
      message: error.message
    });
  }
}

/**
 * Rechercher une ville par son nom dans la BDD
 */
async function findCityByName(cityName: string): Promise<any> {
  const city = await City.findOne({
    where: {
      name: {
        [Op.like]: `%${cityName}%`
      }
    },
    include: [{
      model: Country,
      as: 'country'
    }]
  });
  
  return city;
}

/**
 * Calculer les coordonnées des points nord-est et sud-ouest
 * pour former un carré autour des coordonnées centrales
 */
function calculateBoundingBox(lat: number, lng: number, radiusKm: number = DEFAULT_SEARCH_RADIUS) {
  // Conversion du rayon de km en degrés (approximation)
  // 1 degré de latitude ≈ 111 km
  const latRadius = radiusKm / 111;
  
  // 1 degré de longitude dépend de la latitude
  // À l'équateur, 1 degré de longitude ≈ 111 km
  // Formule: cos(latitude) * 111 km
  const lngRadius = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)));
  
  return {
    northEast: {
      lat: lat + latRadius,
      lng: lng + lngRadius
    },
    southWest: {
      lat: lat - latRadius,
      lng: lng - lngRadius
    }
  };
}

/**
 * Rechercher des événements via l'API Algolia dans une zone géographique
 */
async function searchAlgoliaEvents(
  northEast: { lat: number, lng: number }, 
  southWest: { lat: number, lng: number },
  apiUrl: string
): Promise<any[]> {
  try {
    console.log(`Recherche dans la zone: NE[${northEast.lat}, ${northEast.lng}], SW[${southWest.lat}, ${southWest.lng}]`);
    
    // Construire la chaîne de paramètres insideBoundingBox
    const boundingBox = `${northEast.lat},${northEast.lng},${southWest.lat},${southWest.lng}`;
    
    // Construire le corps de la requête au format attendu par Algolia
    const requestBody = {
      requests: [
        {
          indexName: "memo_events",
          params: `highlightPreTag=__ais-highlight__&highlightPostTag=__/ais-highlight__&hitsPerPage=100&maxValuesPerFacet=1000&query=&page=0&insideBoundingBox=${boundingBox}&facets=["dates","rubrique.lvl0","rubrique.lvl2","rubrique.lvl1","organisme.federation","ages","accessibilites","provider","groupes","selection-to-night","selection-today","selection-we","organisme.groupes","lieu.departement.slug","lieu.region.slug","lieu.epci.slug"]&tagFilters=`
        }
      ]
    };
    
    console.log("Envoi de la requête à Algolia...");
    const response = await axios.post(apiUrl, requestBody);
    
    if (response.data && response.data.results && response.data.results[0] && response.data.results[0].hits) {
      const hits = response.data.results[0].hits;
      console.log(`${hits.length} événements trouvés via Algolia`);
      return hits;
    }
    
    console.log("Aucun événement trouvé via Algolia");
    return [];
  } catch (error: any) {
    console.error('Erreur lors de la recherche Algolia:', error);
    throw new Error(`Erreur Algolia: ${error.message}`);
  }
}

/**
 * Sauvegarder les événements dans la base de données
 */
async function saveEventsToDB(events: any[], city: any): Promise<{ savedCount: number, savedEvents: any[] }> {
  console.log(`Traitement de ${events.length} événements, dont ${events.filter(e => e.lieu).length} avec des informations de lieu`);
  
  const savedEvents: any[] = [];
  let savedCount = 0;
  let savedPlacesCount = 0;
  
  // Transaction pour assurer la cohérence des données
  const transaction = await sequelize.transaction();
  
  try {
    for (const eventData of events) {
      try {
        // *** PARTIE 1: TRAITEMENT DU LIEU ***
        let placeId = null;
        
        if (eventData.lieu) {
          const lieuData = eventData.lieu;
          
          // Extraire le nom du lieu et l'adresse
          // Format attendu: "Médiathèque Henri Vincenot, 5bis Avenue de Dijon"
          let placeName = '';
          let placeAddress = '';
          
          if (lieuData.adresse) {
            const addressParts = lieuData.adresse.split(',');
            if (addressParts.length > 1) {
              placeName = addressParts[0].trim();
              placeAddress = addressParts.slice(1).join(',').trim();
            } else {
              placeName = lieuData.nom || 'Lieu sans nom';
              placeAddress = lieuData.adresse;
            }
          } else {
            placeName = lieuData.nom || 'Lieu sans nom';
          }
          
          // Chercher si le lieu existe déjà
          let place = await Place.findOne({
            where: {
              [Op.or]: [
                { name_eng: placeName },
                { 
                  [Op.and]: [
                    { lat: lieuData.latitude },
                    { lng: lieuData.longitude }
                  ]
                }
              ]
            },
            transaction
          });
          
          if (!place) {
            // Créer un nouveau lieu
            try {
              const zipCode = lieuData.commune?.codePostal || '';
              const cityAddress = lieuData.commune?.libelle || '';
              
              place = await Place.create({
                slug: createSlug(placeName),
                name_eng: placeName,
                type: 'event_venue', // Type par défaut pour les lieux d'événements
                city_id: city.id,
                address: placeAddress,
                zip_code: zipCode,
                city_address: cityAddress,
                lat: lieuData.latitude,
                lng: lieuData.longitude,
                public: true,
                description_scrapio: eventData.texte || ''
              }, { transaction });
              
              console.log(`Nouveau lieu créé: ${placeName}`);
              savedPlacesCount++;
            } catch (placeError) {
              console.error(`Erreur lors de la création du lieu ${placeName}:`, placeError);
              // Affichage plus complet de l'erreur
            }
          }
          
          if (place) {
            placeId = place.id_tomexplore;
          }
        }
        
        // *** PARTIE 2: TRAITEMENT DE L'ÉVÉNEMENT (CODE EXISTANT) ***
        const name = eventData.titre || eventData.name || 'Sans titre';
        
        // Traitement des dates (code existant)
        let startDate = null;
        let endDate = null;
        
        if (eventData["date-first"]) {
          startDate = new Date(eventData["date-first"] * 1000);
        }
        
        if (eventData["date-last"]) {
          endDate = new Date(eventData["date-last"] * 1000);
        } else if (startDate) {
          endDate = startDate;
        }
        
        // Méthode alternative pour les dates (code existant)
        if (!startDate && eventData["_date-first-literal"]) {
          const [datePart, timePart] = eventData["_date-first-literal"].split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          startDate = new Date(year, month - 1, day);
        }
        
        if (!endDate && eventData["_date-last-literal"]) {
          const [datePart, timePart] = eventData["_date-last-literal"].split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          endDate = new Date(year, month - 1, day);
        }
        
        const isRecurring = startDate && endDate && 
                          startDate.getTime() !== endDate.getTime() &&
                          (endDate.getTime() - startDate.getTime() > 86400000);
        const eventType = isRecurring ? 'event_recurring' : 'event_ponctual';
        
        const description = eventData.texte || '';
        const url = `https://www.infolocale.fr${eventData.chemin}` || '';
        const category = eventData.rubrique?.lvl0 || eventData.categorie || '';
        
        // Vérifier si l'événement existe déjà
        const existingEvent = await Event.findOne({
          where: {
            name,
            city_id: city.id,
            event_date_start: startDate
          },
          transaction
        });
        
        if (existingEvent) {
          console.log(`Événement déjà existant: ${name}`);
          continue;
        }
        
        // Créer le slug pour l'événement
        const slug = createSlug(name);
        
        // Formater les données selon le modèle Event
        const formattedEvent = {
          name,
          country_id: city.country_id,
          city_id: city.id,
          place_id: placeId, // Association avec le lieu
          website_link: url,
          event_type: eventType,
          event_date_start: startDate,
          event_date_end: endDate,
          event_category: category,
          description,
          slug
        };
        
        // Créer l'événement
        const newEvent = await Event.create(formattedEvent, { transaction });
        
        // Si une image est disponible, la sauvegarder (code existant)
        if (eventData.photo?.url) {
          try {
            const imageUrl = eventData.photo.url;
            const image = await Image.create({
              image_name: `algolia_${newEvent.id}_${Date.now()}.jpg`,
              original_url: imageUrl,
              place_id: placeId, // Association avec le lieu également
              event_id: newEvent.id,
              author: 'Algolia API',
              license: eventData.photo.credits || 'Infolocale'
            }, { transaction });
            
            // Mettre à jour l'événement avec l'ID de l'image
            await newEvent.update({ img_id: image.id }, { transaction });
          } catch (imageError) {
            console.error(`Erreur lors de la sauvegarde de l'image: ${imageError}`);
          }
        }
        
        savedEvents.push(newEvent);
        savedCount++;
      } catch (eventError) {
        console.error(`Erreur lors de la sauvegarde de l'événement: ${eventError}`);
      }
    }
    
    // Valider la transaction si tout s'est bien passé
    await transaction.commit();
    console.log(`${savedCount} événements et ${savedPlacesCount} lieux sauvegardés avec succès`);
    
    return { savedCount, savedEvents };
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await transaction.rollback();
    console.error(`Erreur lors de la sauvegarde des événements: ${error}`);
    throw error;
  }
}

/**
 * Créer un slug à partir d'un titre
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Supprimer les caractères spéciaux
    .replace(/\s+/g, '-')      // Remplacer les espaces par des tirets
    .replace(/-+/g, '-')       // Éliminer les tirets consécutifs
    .substring(0, 100);        // Limiter la longueur
}