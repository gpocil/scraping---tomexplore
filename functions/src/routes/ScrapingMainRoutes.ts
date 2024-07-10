import { Router } from 'express';
import * as ScrapingController from '../controllers/ScrapingMainController'
const router = Router();

// router.post('/user', GoogleController.fetchImageUrlsFromUserAccount);
router.post('/business', ScrapingController.getPhotosBusiness);
router.post('/tourist_attraction', ScrapingController.getPhotosTouristAttraction);



export default router;
