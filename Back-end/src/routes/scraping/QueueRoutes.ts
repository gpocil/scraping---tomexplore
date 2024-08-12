import { Router } from 'express';
import * as QueueController from '../../controllers/scraping/QueueController'
const router = Router();

router.post('/launchScraping', QueueController.launchScraping);


export default router;
