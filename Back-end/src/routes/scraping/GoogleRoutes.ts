import { Router } from 'express';
import * as GoogleController from '../../controllers/scraping/util/GoogleController';
const router = Router();

router.post('/google', GoogleController.fetchGoogleImgsFromBusinessPage);
router.post('/google_attributes', GoogleController.fetchGoogleBusinessAttributes);



export default router;
