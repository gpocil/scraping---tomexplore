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

app.use(cors());
app.use(bodyParser.json());
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/auth', authRoutes);
app.use('/front', frontRoutes);
// Servir les fichiers statiques depuis le dossier des images
const imagesPath = path.join(__dirname, 'temp');
app.use('/images', express.static(imagesPath));


//-----------------------------------Auth API requise-------------------------------------
// app.use(jwtMiddleware);


app.use('/texplore', scrapingMainRoutes);
app.use('/texplore', texploreRoutes);



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
