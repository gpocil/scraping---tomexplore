import { Router } from 'express';
import * as ImageController from '../../controllers/front/ImageController';
import * as LoginController from '../../controllers/front/LoginController';
import upload from '../../controllers/front/multerCOntroller'

const router = Router();

router.get('/:placeId/images', ImageController.getImagesByPlaceId);
router.get('/getAllImages', ImageController.getPlacesWithImages);
router.post('/deleteImages', ImageController.deleteImagesUser);
router.post('/setTop', ImageController.setTopAndSetChecked);
router.post('/login', LoginController.loginUser);
router.put('/setNeedsAttention', ImageController.setPlaceNeedsAttention);
router.post('/uploadPhotos', upload.array('photos'), ImageController.uploadPhotos);  // Use the multer instance here

export default router;
