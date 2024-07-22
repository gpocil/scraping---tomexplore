import { Router } from 'express';
import * as ImageController from '../../controllers/front/ImageController'

const router = Router();

router.get('/:placeId/images', ImageController.getImagesByPlaceId);
router.get('/getAllImages', ImageController.getUncheckedPlacesWithImages);
router.post('/deleteImages', ImageController.deleteImagesUser);
router.post('/setTop', ImageController.setTopAndSetChecked);
router.get('/getCheckedCity/:name', ImageController.getCheckedPlacesByCity);
router.get('/getChecked/:placeId', ImageController.getImagesByPlaceId);

export default router;
