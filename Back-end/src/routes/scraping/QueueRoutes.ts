import { Router } from 'express';
import * as QueueController from '../../controllers/scraping/QueueController'
const router = Router();

router.post('/launchScraping', QueueController.launchScraping);
router.get('/sweepEntries', QueueController.checkProcessedEntries);


export default router;
