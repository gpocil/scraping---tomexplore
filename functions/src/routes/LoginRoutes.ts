import express from 'express';
import { login } from '../controllers/security/LoginController';

const router = express.Router();

router.post('/login', login);

export default router;
