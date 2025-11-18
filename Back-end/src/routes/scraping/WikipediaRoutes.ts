import { Router } from 'express';
import * as WikipediaController from '../../controllers/scraping/util/WikipediaController';
const router = Router();

router.post('/wiki', WikipediaController.findWikipediaUrl);


export default router;
