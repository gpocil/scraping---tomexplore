import { Router } from 'express';
import * as WikimediaController from '../../controllers/scraping/util/WikimediaController';

const router = Router();

router.post('/wikimedia', WikimediaController.wikiMediaSearch);

export default router;
