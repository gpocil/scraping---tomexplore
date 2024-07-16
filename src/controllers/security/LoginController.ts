import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

export function login(req: Request, res: Response): void {
    const { apiKey } = req.body;
    if (apiKey && apiKey === config.apiKey) {
        const token = jwt.sign({ apiKey }, config.jwtSecret, { expiresIn: '2h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid API key' });
    }
}
