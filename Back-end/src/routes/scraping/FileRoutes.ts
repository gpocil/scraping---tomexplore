import { Router } from 'express';
import * as FileController from '../../controllers/scraping/FileController';

const router = Router();

/**
 * @swagger
 * /delete-folder/{name}:
 *   delete:
 *     summary: Delete a folder and its contents
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the folder to delete
 *     responses:
 *       200:
 *         description: Folder deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Folder 'example-folder' and all its contents have been deleted."
 *       400:
 *         description: Folder name is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Folder name is required"
 *       404:
 *         description: Folder not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Folder not found: /path/to/folder"
 *       500:
 *         description: Error deleting folder
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error deleting folder 'example-folder': Error message"
 */
router.delete('/delete-folder/:name', FileController.deleteFolderRecursive);

export default router;
