import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
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


app.use(cors()); // Applique CORS à toutes les origines par défaut
console.log('CORS middleware is now applied to all origins.');

app.use(bodyParser.json());

// Configuration Swagger
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/front', frontRoutes);
const imagesPath = path.join(__dirname, 'temp');
console.log('Image path: ' + imagesPath);
app.use('/images', express.static(imagesPath));
app.use('/api', QueueRoutes);

// Routes nécessitant l'authentification
app.use(jwtMiddleware);
app.use('/api/texplore', scrapingMainRoutes);
app.use('/api/texplore', texploreRoutes);
app.use('/api/unsplash', unsplashRoutes);
app.use('/api', InstagramRoutes);
app.use('/api', wikipediaRoutes);
app.use('/api', wikimediaRoutes);
app.use('/api', fileRoutes);
app.use('/api', googleRoutes);

// Servir les fichiers statiques de l'application React
app.use(express.static(path.join(__dirname, 'front-end/build')));

// Catch-all pour toutes les autres routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'front-end/build', 'index.html'));
});

// Connexion à la base de données et démarrage du serveur
sequelize.authenticate()
    .then(() => {
        console.log('Connection to the database has been established successfully.');

        sequelize.sync()
            .then(() => {
                console.log('Database & tables created!');

                // Démarrage du serveur en HTTP
                app.listen(port, () => {
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
