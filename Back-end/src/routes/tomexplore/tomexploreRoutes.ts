import { Router } from 'express';
import * as tomexploreController from '../../controllers/tomexplore/TomexploreController'

const router = Router();

router.get('/getCheckedPlace/:placeId', tomexploreController.getAllCheckedImagesByPlaceId);
router.get('/getCheckedCity/:cityName', tomexploreController.getCheckedPlacesByCity);


export default router;
