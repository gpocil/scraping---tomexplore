import { Router } from 'express';
import * as EventsController from '../../controllers/events/EventsController';

const router = Router();

// Route pour importer des événements
router.post('/events', EventsController.fetchInfolocaleEvents);

// Routes spécifiques AVANT les routes avec paramètres dynamiques
router.get('/events/search', EventsController.searchEvents); // 1. Route spécifique d'abord
router.get('/events', EventsController.getAllEvents);        // 2. Route générique ensuite
router.get('/events/:id', EventsController.getEventById);    // 3. Route avec paramètre dynamique en dernier

export default router;