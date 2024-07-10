import { Router } from 'express';
import * as WikipediaController from '../controllers/scraping/WikipediaController';
const router = Router();

router.post('/wiki', WikipediaController.wikipediaSearch);


export default router;
