import { Router } from 'express';
import * as FileController from '../../controllers/scraping/FileController';

const router = Router();

router.delete('/delete-folder/:name', FileController.deleteFolderRecursive);
router.post('/dlbusiness', FileController.downloadPhotosTest);

export default router;
