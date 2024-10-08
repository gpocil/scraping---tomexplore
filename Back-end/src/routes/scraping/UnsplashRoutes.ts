import { Router } from 'express';
import * as UnsplashController from '../../controllers/scraping/util/UnsplashController';
const router = Router();

router.post('/unsplash', UnsplashController.unsplashSearch);


export default router;
