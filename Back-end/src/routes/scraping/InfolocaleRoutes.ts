// Dans routes/infolocaleRoutes.ts
import { Router } from 'express';
import * as InfolocaleController from '../../controllers/scraping/util/InfolocaleControllers';

const router = Router();
router.post('/infolocale', InfolocaleController.fetchInfolocaleEvents);
export default router;

