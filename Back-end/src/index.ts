import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
// import https from 'https'; // Inutile si Nginx gère HTTPS
// import fs from 'fs'; // Inutile si Nginx gère HTTPS
import scrapingMainRoutes from './routes/scraping/ScrapingMainRoutes';
import InstagramRoutes from './routes/scraping/InstagramRoutes';
import authRoutes from './routes/security/LoginRoutes';
import wikipediaRoutes from './routes/scraping/WikipediaRoutes';
import wikimediaRoutes from './routes/scraping/WikimediaRoutes';
import fileRoutes from './routes/scraping/FileRoutes';
import googleRoutes from './routes/scraping/GoogleRoutes';
import frontRoutes from './routes/front/frontRoutes';
import texploreRoutes from './routes/tomexplore/tomexploreRoutes';
import unsplashRoutes from './routes/scraping/UnsplashRoutes';
import QueueRoutes from './routes/scraping/QueueRoutes';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { jwtMiddleware } from './controllers/security/JWTController';
import swaggerOptions from './swagger';
import sequelize from './sequelize';
import './models';

const app = express();
const port = 3000;

// Define CORS options - allow all origins
const corsOptions: CorsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

// Apply CORS middleware with options
app.use(cors(corsOptions));
console.log('CORS middleware is now applied to all origins.');

app.use(bodyParser.json());
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/api/auth', authRoutes);
app.use('/api/front', frontRoutes);
const imagesPath = path.join(__dirname, '../dist/temp');
app.get('/api/images-path', (req: Request, res: Response) => {
    res.json({ path: imagesPath });
});

app.use('/images', express.static(imagesPath));
app.use('/api', QueueRoutes);

//------------------------Auth required---------------------------------

// app.use(jwtMiddleware);


app.use('/api/texplore', scrapingMainRoutes);
app.use('/api/texplore', texploreRoutes);
app.use('/api/unsplash', unsplashRoutes);
app.use('/api', InstagramRoutes);
app.use('/api', wikipediaRoutes);
app.use('/api', wikimediaRoutes);
app.use('/api', fileRoutes);
app.use('/api', googleRoutes);

sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');

        sequelize.sync()
            .then(() => {
                console.log('Database & tables created!');

                // Utilisation de HTTP au lieu de HTTPS, car Nginx gère HTTPS
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
