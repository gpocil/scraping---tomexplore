import dotenv from 'dotenv';

dotenv.config();

export const config = {
    apiKey: process.env.API_KEY || '',
    jwtSecret: process.env.JWT_SECRET || '',
    dev: process.env.DEV === 'true',
    headless: process.env.DEV !== 'true',
    rapidApiKey: process.env.RAPID_API_KEY || ''
};
