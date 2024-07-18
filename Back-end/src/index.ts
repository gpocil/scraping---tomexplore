import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import instagramRoutes from './routes/scraping/InstagramRoutes';
import googleRoutes from './routes/scraping/GoogleRoutes';
import scrapingMainRoutes from './routes/scraping/ScrapingMainRoutes';
import fileRoutes from './routes/scraping/FileRoutes';
import wikiRoutes from './routes/scraping/WikipediaRoutes';
import unsplashRoutes from './routes/scraping/UnsplashRoutes';
import wikimediaRoutes from './routes/scraping/WikimediaRoutes';
import authRoutes from './routes/scraping/LoginRoutes';
import placesRoutes from './routes/front/placesRoutes';
import imagesRoutes from './routes/front/imageRoutes';

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { jwtMiddleware } from './controllers/security/JWTController';
import swaggerOptions from './swagger';
import sequelize from './sequelize';
import path from 'path';
import './models';  // Import des modèles et initialisation des associations

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('', authRoutes);

// app.use(jwtMiddleware);

app.use('', googleRoutes);
app.use('', instagramRoutes);
app.use('', scrapingMainRoutes);
app.use('', fileRoutes);
app.use('', wikiRoutes);
app.use('', unsplashRoutes);
app.use('', wikimediaRoutes);
app.use('', placesRoutes);
app.use('', imagesRoutes);

// Servir les fichiers statiques depuis le dossier des images
const imagesPath = path.join(__dirname, 'temp');
app.use('/images', express.static(imagesPath));

// Test and sync database
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');

        sequelize.sync()
            .then(() => {
                console.log('Database & tables created!');

                app.listen(port, () => {
                    console.log('Doc available at localhost:' + port + '/api-docs');
                });
            })
            .catch(err => {
                console.error('Unable to sync the database:', err);
            });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });
