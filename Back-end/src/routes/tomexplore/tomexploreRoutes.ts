import { Router } from 'express';
import * as tomexploreController from '../../controllers/tomexplore/TomexploreController'

const router = Router();

router.get('/getCheckedPlace/:placeId', tomexploreController.getAllCheckedImagesByPlaceId);
router.get('/getCheckedCity/:cityName', tomexploreController.getCheckedPlacesByCity);
router.delete('/deletePlace/:placeId', tomexploreController.deleteCheckedPlaceById);
router.delete('/deleteCity/:cityName', tomexploreController.deleteCheckedPlacesByCity);



export default router;
