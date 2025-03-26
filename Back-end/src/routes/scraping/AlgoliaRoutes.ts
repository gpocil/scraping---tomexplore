import { Router } from 'express';
import * as AlgoliaController from '../../controllers/scraping/util/AlgoliaControllers';

const router = Router();

router.post('/algolia', AlgoliaController.fetchEventsByCity);

export default router;