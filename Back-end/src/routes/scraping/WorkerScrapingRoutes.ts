import { Router } from 'express';
import * as WorkerScrapingController from '../../controllers/scraping/WorkerScrapingController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Worker Scraping
 *   description: Routes for review pipeline workers — uses UUID for image folders (no ID collision in batch)
 */

/**
 * @swagger
 * /api/worker/business:
 *   post:
 *     summary: Fetch photos for a business (worker — UUID folder)
 *     tags: [Worker Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - uuid
 *                 - name_en
 *                 - city
 *                 - country
 *               properties:
 *                 uuid:
 *                   type: string
 *                   description: Unique UUID for this place's image folder
 *                 name_en:
 *                   type: string
 *                 name_fr:
 *                   type: string
 *                 link_maps:
 *                   type: string
 *                 instagram_username:
 *                   type: string
 *                 address:
 *                   type: string
 *                 city:
 *                   type: string
 *                 country:
 *                   type: string
 *     responses:
 *       200:
 *         description: Photos fetched successfully
 */
router.post('/business', WorkerScrapingController.getPhotosBusiness);

/**
 * @swagger
 * /api/worker/tourist_attraction:
 *   post:
 *     summary: Fetch photos for a tourist attraction (worker — UUID folder)
 *     tags: [Worker Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - uuid
 *                 - name_en
 *                 - city
 *                 - country
 *                 - famous
 *               properties:
 *                 uuid:
 *                   type: string
 *                   description: Unique UUID for this place's image folder
 *                 name_en:
 *                   type: string
 *                 name_fr:
 *                   type: string
 *                 link_maps:
 *                   type: string
 *                 address:
 *                   type: string
 *                 city:
 *                   type: string
 *                 country:
 *                   type: string
 *                 famous:
 *                   type: boolean
 *     responses:
 *       200:
 *         description: Photos fetched successfully
 */
router.post('/tourist_attraction', WorkerScrapingController.getPhotosTouristAttraction);

export default router;
