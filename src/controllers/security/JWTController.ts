import { expressjwt } from 'express-jwt';
import { RequestHandler } from 'express';
import { config } from '../../config';

export const jwtMiddleware: RequestHandler = expressjwt({
    secret: config.jwtSecret,
    algorithms: ['HS256']
}).unless({ path: ['/login'] });
