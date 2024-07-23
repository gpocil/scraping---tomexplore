import { Router } from 'express';
import * as ScrapingController from '../../controllers/scraping/ScrapingMainController';

const router = Router();

/**
 * @swagger
 * texplore/business:
 *   post:
 *     summary: Fetch photos from Instagram and Google for a business
 *     tags: [Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - location_full_address
 *             properties:
 *               username:
 *                 type: string
 *                 example: 'awen_brew_pub'
 *               location_full_address:
 *                 type: string
 *                 example: 'Awen BRew Pub, 1 Rue Gilles Gahinet, 56000 Vannes'
 *     responses:
 *       200:
 *         description: Photos fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloadDir:
 *                   type: string
 *                   example: 'C:/path/to/download/directory'
 *                 imageCount:
 *                   type: number
 *                   example: 12
 *                 instagramError:
 *                   type: string
 *                   example: 'Error fetching Instagram images: ...'
 *                 googleError:
 *                   type: string
 *                   example: 'Error fetching Google images: ...'
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: 'Error fetching images: ...'
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Username and Google URL are required'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Failed to fetch images from both Instagram and Google'
 *                 details:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: 'Error message'
 */
router.post('/business', ScrapingController.getPhotosBusiness);

/**
 * @swagger
 * texplore/tourist_attraction:
 *   post:
 *     summary: Fetch photos from Wikimedia and Unsplash for a tourist attraction
 *     tags: [Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - famous
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Tour Eiffel'
 *               famous:
 *                 type: string
 *                 enum: [true, false]
 *                 example: 'true'
 *     responses:
 *       200:
 *         description: Photos fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloadDir:
 *                   type: string
 *                   example: 'C:/path/to/download/directory'
 *                 imageCount:
 *                   type: number
 *                   example: 10
 *                 wikiMediaError:
 *                   type: string
 *                   example: 'Error fetching Wikimedia images: ...'
 *                 unsplashError:
 *                   type: string
 *                   example: 'Error fetching Unsplash images: ...'
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: 'Error fetching images: ...'
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Name and famous field are required'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Failed to fetch images from both Wikimedia and Unsplash'
 *                 details:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: 'Error message'
 */
router.post('/tourist_attraction', ScrapingController.getPhotosTouristAttraction);

export default router;
