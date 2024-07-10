import { Router } from 'express';
import * as WikipediaController from '../controllers/scraping/WikipediaController';
const router = Router();

router.post('/wiki', WikipediaController.googleSearch);


export default router;
