import { Router } from 'express';
import * as ImageController from '../../controllers/front/ImageController'

const router = Router();

router.get('/:placeId/images', ImageController.getImagesByPlaceId);
router.get('/getAllImages', ImageController.getUncheckedPlacesWithImages);
router.post('/deleteImages', ImageController.deleteImagesUser);
router.post('/setTop', ImageController.setTopAndSetChecked);


export default router;
