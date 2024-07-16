import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import instagramRoutes from './routes/InstagramRoutes';
import googleRoutes from './routes/GoogleRoutes';
import scrapingMainRoutes from './routes/ScrapingMainRoutes';
import fileRoutes from './routes/FileRoutes';
import wikiRoutes from './routes/WikipediaRoutes';
import unsplashRoutes from './routes/UnsplashRoutes';
import wikimediaRoutes from './routes/WikimediaRoutes';
import authRoutes from './routes/LoginRoutes';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { jwtMiddleware } from './controllers/security/JWTController';
import swaggerOptions from './swagger';
import sequelize from './sequelize';

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
