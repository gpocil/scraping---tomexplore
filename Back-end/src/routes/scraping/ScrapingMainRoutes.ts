import { Router } from 'express';
import * as ScrapingController from '../../controllers/scraping/ScrapingMainController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Scraping
 *   description: API pour la récupération d'images de lieux touristiques et d'établissements recevant du public
 */

/**
 * @swagger
 * /api/texplore/business:
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
 *               - id_tomexplore
 *               - name_en
 *               - address
 *               - city
 *               - country
 *             properties:
 *               id_tomexplore:
 *                 type: integer
 *               name_en:
 *                 type: string
 *                 example: 'Awen Brew Pub'
 *               name_fr:
 *                 type: string
 *                 example: 'Pub de Brassage Awen'
 *               link_maps:
 *                 type: string
 *                 example: 'https://maps.google.com'
 *               instagram_username:
 *                 type: string
 *                 example: 'awen_brew_pub'
 *               address:
 *                 type: string
 *                 example: '1 Rue Gilles Gahinet'
 *               city:
 *                 type: string
 *                 example: 'Vannes'
 *               country:
 *                 type: string
 *                 example: 'France'
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
 *                   example: 'Missing required fields'
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
 * /api/texplore/tourist_attraction:
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
 *               - id_tomexplore
 *               - name_en
 *               - city
 *               - country
 *               - famous
 *             properties:
 *               id_tomexplore:
 *                 type: integer
 *               name_en:
 *                 type: string
 *                 example: 'Tour Eiffel'
 *               name_fr:
 *                 type: string
 *                 example: 'Eiffel Tower'
 *               link_maps:
 *                 type: string
 *                 example: 'https://maps.google.com'
 *               address:
 *                 type: string
 *                 example: 'Champ de Mars, 5 Avenue Anatole France'
 *               city:
 *                 type: string
 *                 example: 'Paris'
 *               country:
 *                 type: string
 *                 example: 'France'
 *               famous:
 *                 type: boolean
 *                 example: true
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
 *                   example: 'Missing required fields'
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
