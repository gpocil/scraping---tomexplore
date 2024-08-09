import { Router } from 'express';
import * as GoogleController from '../../controllers/scraping/util/GoogleController';
const router = Router();

router.post('/google', GoogleController.fetchGoogleImgsFromBusinessPage);
router.post('/google_attributes', GoogleController.fetchGoogleBusinessAttributes);
router.post('/original_name', GoogleController.getOriginalName);





export default router;
