import { Router } from 'express';
import * as InstagramController from '../controllers/scraping/InstagramController';
const router = Router();

router.post('/insta', InstagramController.fetchInstagramImages);


export default router;
