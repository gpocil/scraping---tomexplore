import { Router } from 'express';
import * as EventsController from '../../controllers/events/EventsController';

const router = Router();

// Route pour importer des événements depuis Infolocale (existante)
router.post('/events', EventsController.fetchInfolocaleEvents);

// Routes pour afficher les événements
router.get('/events', EventsController.getAllEvents);
router.get('/events/:id', EventsController.getEventById);

// Route pour rechercher des événements par critères (ville, dates)
router.get('/events/search', EventsController.searchEvents);

export default router;