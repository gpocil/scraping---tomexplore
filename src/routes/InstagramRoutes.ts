import { Router } from 'express';
import * as InstagramController from '../controllers/InstagramController';
const router = Router();

router.get('/insta', InstagramController.fetchInstagramImages);


export default router;
