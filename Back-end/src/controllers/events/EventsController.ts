import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Event from '../../models/Event';
import Place from '../../models/Place';
import City from '../../models/City';
import Image from '../../models/Image';

/**
 * Récupérer tous les événements avec pagination
 */
export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const events = await Event.findAndCountAll({
      limit,
      offset,
      include: [
        { model: City, as: 'city' },
        { model: Place, as: 'associatedPlace_event' },
        { model: Image, as: 'event_images', required: false }
      ],
      order: [['event_date_start', 'ASC']]
    });
    
    res.status(200).json({
      total: events.count,
      totalPages: Math.ceil(events.count / limit),
      currentPage: page,
      events: events.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer un événement par son ID
 */
export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id, {
      include: [
        { model: City, as: 'city' },
        { model: Place, as: 'associatedPlace_event' },
        { model: Image, as: 'event_images', required: false }
      ]
    });
    
    if (!event) {
      res.status(404).json({ message: 'Événement non trouvé' });
      return;
    }
    
    res.status(200).json(event);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Rechercher des événements par critères multiples
 * GET /api/events/search?city=Paris&dateStart=2025-04-01&dateEnd=2025-04-30&eventType=concert
 */
export const searchEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔍 Recherche d\'événements avec les paramètres:', req.query);
      
      // Extraction des critères depuis les paramètres de requête
      const { city, dateStart, dateEnd, eventType } = req.query;
  
      // Vérification des critères obligatoires
      if (!city) {
        console.log('❌ Critère de ville manquant');
        res.status(400).json({ message: 'Le critère de ville est obligatoire' });
        return;
      }
  
      if (!dateStart || !dateEnd) {
        console.log('❌ Dates de début ou de fin manquantes');
        res.status(400).json({ message: 'Les dates de début et de fin sont obligatoires' });
        return;
      }

      console.log(`🏙️ Recherche dans la ville: ${city}`);
      console.log(`📅 Période: du ${dateStart} au ${dateEnd}`);
      if (eventType) console.log(`🎭 Type d'événement: ${eventType}`);
  
      // Construction des conditions de recherche pour les événements
      const whereConditions: any = {
        // L'événement commence avant la fin de la période
        event_date_start: {
          [Op.lte]: new Date(dateEnd as string)
        },
        // L'événement se termine après le début de la période
        event_date_end: {
          [Op.gte]: new Date(dateStart as string)
        }
      };
  
      // Ajout du type d'événement si fourni (critère optionnel)
      if (eventType) {
        whereConditions.event_type = eventType;
      }
  
      console.log('🔎 Conditions de recherche:', JSON.stringify(whereConditions));
  
      // Recherche des événements
      const events = await Event.findAll({
        include: [
          { 
            model: City, 
            as: 'city',
            where: {
              name: {
                [Op.like]: `%${city}%`
              }
            }
          },
          { model: Place, as: 'associatedPlace_event' },
          { model: Image, as: 'event_images', required: false }
        ],
        where: whereConditions,
        order: [['event_date_start', 'ASC']]
      });
  
      console.log(`✅ Résultats trouvés: ${events.length} événements`);
      
      // Si aucun événement trouvé, renvoyer un message approprié
      if (events.length === 0) {
        res.status(200).json({
          total: 0,
          events: [],
          message: "Aucun événement ne correspond à ces critères"
        });
        return;
      }

      res.status(200).json({
        total: events.length,
        events
      });
    } catch (error) {
      console.error('❌ Erreur lors de la recherche d\'événements:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la recherche' });
    }
  };
  
export function fetchInfolocaleEvents(arg0: string, fetchInfolocaleEvents: any) {
    throw new Error('Function not implemented.');
}
