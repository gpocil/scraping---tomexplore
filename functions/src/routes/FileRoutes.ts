import * as FileController from '../controllers/FileController';
import { Router } from 'express';
const router = Router();


router.delete('/delete-folder/:name', FileController.deleteFolderRecursive);


export default router;
