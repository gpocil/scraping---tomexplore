import { Router } from 'express';
import * as tomexploreController from '../../controllers/tomexplore/TomexploreController';
import * as LoginController from '../../controllers/front/LoginController'

const router = Router();


/**
 * @swagger
 * /texplore/getCheckedPlace/{placeId}:
 *   get:
 *     summary: Retrieve all verified images for a given place by its ID
 *     tags: [Get Checked Places]
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
 * /texplore/getCheckedCity/{cityName}:
 *   get:
 *     summary: Retrieve all verified places and their images for a given city
 *     tags: [Get Checked Places]
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
 * /texplore/deletePlace/{placeId}:
 *   delete:
 *     summary: Delete a verified place and its images by place ID
 *     tags: [Delete Checked Places]
 *     parameters:
 *       - in: path
 *         name: placeId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the place
 *     responses:
 *       200:
 *         description: Verified place and its images successfully deleted
 *       404:
 *         description: Place not found or not verified
 *       500:
 *         description: Internal server error
 */
router.delete('/deletePlace/:placeId', tomexploreController.deleteCheckedPlaceById);

/**
 * @swagger
 * /texplore/deleteCity/{cityName}:
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
 * tags:
 *   name: Authentication
 *   description: API for user authentication
 */

/**
 * @swagger
 * /texplore/createUser:
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

export default router;
