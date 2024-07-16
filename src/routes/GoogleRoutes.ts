import { Router } from 'express';
import * as GoogleController from '../controllers/scraping/GoogleController';
const router = Router();

router.post('/google', GoogleController.fetchGoogleImgsFromBusinessPage);
router.post('/google_attributes', GoogleController.fetchGoogleBusinessAttributes);



export default router;
