import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../../models/User';

export const createUser = async (req: Request, res: Response) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Login and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ login, password: hashedPassword });
        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Login and password are required' });
    }

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
};
