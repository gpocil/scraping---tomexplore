import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { check, validationResult } from 'express-validator';
import User from '../../models/User';

export const createUser = [
    check('login').isAlphanumeric().withMessage('Login must be alphanumeric'),
    check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { login, password } = req.body;

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await User.create({ login, password: hashedPassword });
            res.status(201).json({ message: 'User created successfully', userId: user.id });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
];

export const loginUser = [
    check('login').isAlphanumeric().withMessage('Login must be alphanumeric'),
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { login, password } = req.body;

        try {
            const user = await User.findOne({ where: { login } });

            if (!user) {
                return res.status(401).json({ error: 'Invalid login or password' });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Invalid login or password' });
            }

            res.json({ login: true });
        } catch (error) {
            console.error('Error logging in user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
];
