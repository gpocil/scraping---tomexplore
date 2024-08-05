import { Router } from 'express';
import * as tomexploreController from '../../controllers/tomexplore/TomexploreController';
import * as LoginController from '../../controllers/front/LoginController'
import * as GoogleController from '../../controllers/scraping/util/GoogleController'

const router = Router();

/**
 * @swagger
 * /api/texplore/getCheckedPlace/{placeId}:
 *   get:
 *     summary: Retrieve all verified images for a given place by its ID
 *     tags: [Get Places]
 *     parameters:
 *       - in: path
 *         name: placeId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the place
 *     responses:
 *       200:
 *         description: List of verified images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   image_name:
 *                     type: string
 *                   url:
 *                     type: string
 *                   author:
 *                     type: string
 *                   license:
 *                     type: string
 *                   top:
 *                     type: integer
 *                   original_url:
 *                     type: string
 *       404:
 *         description: Place not found or not verified
 *       500:
 *         description: Internal server error
 */
router.get('/getCheckedPlace/:placeId', tomexploreController.getAllCheckedImagesByPlaceId);

/**
 * @swagger
 * /api/texplore/getCheckedCity/{cityName}:
 *   get:
 *     summary: Retrieve all verified places and their images for a given city
 *     tags: [Get Places]
 *     parameters:
 *       - in: path
 *         name: cityName
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the city
 *     responses:
 *       200:
 *         description: List of verified places and their images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   place_id:
 *                     type: integer
 *                   place_name:
 *                     type: string
 *                   wikipedia_link:
 *                     type: string
 *                   google_maps_link:
 *                     type: string
 *                   folder:
 *                     type: string
 *                   images:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         image_name:
 *                           type: string
 *                         url:
 *                           type: string
 *                         author:
 *                           type: string
 *                         license:
 *                           type: string
 *                         top:
 *                           type: integer
 *                         original_url:
 *                           type: string
 *                   city_name:
 *                     type: string
 *                   country_name:
 *                     type: string
 *       404:
 *         description: No verified places found for this city
 *       500:
 *         description: Internal server error
 */
router.get('/getCheckedCity/:cityName', tomexploreController.getCheckedPlacesByCity);
/**
 * @swagger
 * /api/texplore/deletePlaces:
 *   delete:
 *     summary: Delete verified places and their images by place IDs
 *     tags: [Delete Checked Places]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               placeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *             required:
 *               - placeIds
 *     responses:
 *       200:
 *         description: Verified places and their images successfully deleted
 *       400:
 *         description: placeIds must be a non-empty array
 *       404:
 *         description: Place not found or not verified
 *       500:
 *         description: Internal server error
 */
router.delete('/deletePlaces', tomexploreController.deleteCheckedPlacesByIds);

/**
 * @swagger
 * /api/texplore/deleteCity/{cityName}:
 *   delete:
 *     summary: Delete all verified places and their images for a given city
 *     tags: [Delete Checked Places]
 *     parameters:
 *       - in: path
 *         name: cityName
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the city
 *     responses:
 *       200:
 *         description: Verified places and their images successfully deleted
 *       404:
 *         description: No verified places found for this city
 *       500:
 *         description: Internal server error
 */
router.delete('/deleteCity/:cityName', tomexploreController.deleteCheckedPlacesByCity);

/**
 * @swagger
 * /api/texplore/getAllPlacesToBeDeleted:
 *   get:
 *     summary: Retrieve all places marked to be deleted
 *     tags: [Get Places]
 *     responses:
 *       200:
 *         description: List of places to be deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   place_id:
 *                     type: integer
 *                   place_name:
 *                     type: string
 *                   wikipedia_link:
 *                     type: string
 *                   google_maps_link:
 *                     type: string
 *                   folder:
 *                     type: string
 *                   images:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         image_name:
 *                           type: string
 *                         url:
 *                           type: string
 *                         author:
 *                           type: string
 *                         license:
 *                           type: string
 *                         top:
 *                           type: integer
 *                         original_url:
 *                           type: string
 *                   city_name:
 *                     type: string
 *                   country_name:
 *                     type: string
 *       404:
 *         description: No places to be deleted found
 *       500:
 *         description: Internal server error
 */
router.get('/getAllPlacesToBeDeleted', tomexploreController.getAllPlacesToBeDeleted);

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API for user authentication
 */

/**
 * @swagger
 * /api/texplore/createUser:
 *   post:
 *     summary: Register a new user
 *     tags: [Malgache Creator]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Login and password are required
 *       500:
 *         description: Internal server error
 */

router.post('/createUser', LoginController.createUser);

/**
 * @swagger
 * /api/texplore/google_attributes:
 *   post:
 *     summary: Retrieve Google Business attributes for a given location
 *     tags: [Google Attributes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location_full_address
 *             properties:
 *               location_full_address:
 *                 type: string
 *                 description: Full address of the location to fetch attributes for
 *     responses:
 *       200:
 *         description: Successfully retrieved attributes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attributes:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                 count:
 *                   type: number
 *                 error:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Location address is required
 *       500:
 *         description: Internal server error
 */

router.post('/google_attributes', GoogleController.fetchGoogleBusinessAttributes);

/**
 * @swagger
 * /api/texplore/getAllCheckedPlaces:
 *   get:
 *     summary: Retrieve all verified places
 *     tags: [Get Places]
 *     responses:
 *       200:
 *         description: List of all checked places
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   place_id:
 *                     type: integer
 *                   place_name:
 *                     type: string
 *                   wikipedia_link:
 *                     type: string
 *                   google_maps_link:
 *                     type: string
 *                   folder:
 *                     type: string
 *                   images:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         image_name:
 *                           type: string
 *                         url:
 *                           type: string
 *                         author:
 *                           type: string
 *                         license:
 *                           type: string
 *                         top:
 *                           type: integer
 *                         original_url:
 *                           type: string
 *                   city_name:
 *                     type: string
 *                   country_name:
 *                     type: string
 *       404:
 *         description: No checked places found
 *       500:
 *         description: Internal server error
 */
router.get('/getAllCheckedPlaces', tomexploreController.getAllCheckedPlaces);

/**
 * @swagger
 * /api/texplore/getAllPlacesNeedingAttention:
 *   get:
 *     summary: Retrieve all places needing attention
 *     tags: [Get Places]
 *     responses:
 *       200:
 *         description: List of all places needing attention
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   place_id:
 *                     type: integer
 *       404:
 *         description: No places needing attention found
 *       500:
 *         description: Internal server error
 */
router.get('/getAllPlacesNeedingAttention', tomexploreController.getAllPlacesNeedingAttention);

export default router;
