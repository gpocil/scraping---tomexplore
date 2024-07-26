import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import scrapingMainRoutes from './routes/scraping/ScrapingMainRoutes';
import authRoutes from './routes/security/LoginRoutes';
import frontRoutes from './routes/front/frontRoutes';
import texploreRoutes from './routes/tomexplore/tomexploreRoutes';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { jwtMiddleware } from './controllers/security/JWTController';
import swaggerOptions from './swagger';
import sequelize from './sequelize';
import path from 'path';
import './models';

const app = express();
const port = 3000;

const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3001/login',
    'http://localhost',
    'http://37.187.35.37:3001',
    'http://37.187.35.37:3001/login',
    'http://37.187.35.37',
    'http://37.187.35.37:3000/api-docs',
    'http://37.187.35.37:3000',
    'http://localhost:3000/api-docs',
    'http://localhost:3000'
];

const corsOptions: CorsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/api/auth', authRoutes);
app.use('/api/front', frontRoutes);

const imagesPath = path.join(__dirname, 'temp');
console.log('imagepath : ' + imagesPath);
app.use('/images', express.static(imagesPath));

app.use('/api/texplore', scrapingMainRoutes);
app.use('/api/texplore', texploreRoutes);

sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');

        sequelize.sync()
            .then(() => {
                console.log('Database & tables created!');

                app.listen(port, '0.0.0.0', () => {
                    console.log(`Server running at http://localhost:${port}/api-docs`);
                });
            })
            .catch(err => {
                console.error('Unable to sync the database:', err);
            });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });
