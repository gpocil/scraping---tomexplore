import { Router } from 'express';
import * as GoogleController from '../../controllers/scraping/util/GoogleController';
const router = Router();

router.post('/google', GoogleController.fetchGoogleImgsFromBusinessPage);



export default router;
