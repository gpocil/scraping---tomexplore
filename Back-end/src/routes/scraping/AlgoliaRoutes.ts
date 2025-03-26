import { Router } from 'express';
import * as AlgoliaController from '../../controllers/scraping/util/AlgoliaControllers';

const router = Router();

router.post('/events-by-city', AlgoliaController.fetchEventsByCity);

export default router;