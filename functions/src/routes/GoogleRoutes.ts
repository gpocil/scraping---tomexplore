import { Router } from 'express';
import * as GoogleController from '../controllers/scraping/GoogleController';
const router = Router();

// router.post('/user', GoogleController.fetchImageUrlsFromUserAccount);
router.post('/business', GoogleController.fetchGoogleImgsFromBusinessPage);


export default router;
