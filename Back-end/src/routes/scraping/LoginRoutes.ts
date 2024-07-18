import express from 'express';
import { login } from '../../controllers/security/LoginController';

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login to generate a JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - apiKey
 *             properties:
 *               apiKey:
 *                 type: string
 *                 example: 'your-manually-generated-api-key'
 *     responses:
 *       200:
 *         description: JWT generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: 'your-jwt-token'
 *       401:
 *         description: Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Invalid API key'
 */
router.post('/login', login);

export default router;
