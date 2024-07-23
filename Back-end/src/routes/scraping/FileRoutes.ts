import { Router } from 'express';
import * as FileController from '../../controllers/scraping/FileController';

const router = Router();

router.delete('/delete-folder/:name', FileController.deleteFolderRecursive);

export default router;
