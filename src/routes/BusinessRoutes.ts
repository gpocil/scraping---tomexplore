import { Router } from 'express';
import * as ImagesController from '../controllers/BusinessController'
const router = Router();

// router.post('/user', GoogleController.fetchImageUrlsFromUserAccount);
router.post('/images', ImagesController.getPhotos);


export default router;
