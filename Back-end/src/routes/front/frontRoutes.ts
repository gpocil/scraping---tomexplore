import { Router } from 'express';
import * as ImageController from '../../controllers/front/ImageController';
import * as LoginController from '../../controllers/front/LoginController';
import upload from '../../controllers/front/MulterController';
import * as UserStatsController from '../../controllers/front/UserStatsController'

const router = Router();

router.get('/:placeId/images', ImageController.getImagesByPlaceId);
router.get('/getAllImages', ImageController.getPlacesWithImages);
router.post('/deleteImages', ImageController.deleteImagesUser);
router.post('/setTop', ImageController.setTopAndSetChecked);
router.post('/login', LoginController.loginUser);
router.put('/setNeedsAttention', ImageController.setPlaceNeedsAttention);
router.post('/uploadPhotos/:place_id', upload.array('photos'), ImageController.uploadPhotos);
router.post('/uploadPhotos/:place_id', upload.array('photos'), ImageController.uploadPhotos);
router.post('/setPlaceToBeDeleted', ImageController.setPlaceToBeDeleted);
router.post('/updateInstagram', ImageController.updateInstagram);
router.post('/updateWikimedia', ImageController.updateWikimedia);
router.post('/updateGoogle', ImageController.updateGoogleMaps);
router.post('/placeAbort', UserStatsController.updatePlaceAbort);
router.post('/placeEnd', UserStatsController.updatePlaceEnd);
router.post('/placeStart', UserStatsController.updatePlaceStart);
router.get('/userStats', UserStatsController.getUsersInfo);
router.get('/getPlace/:id', ImageController.getSinglePlace);






export default router;
