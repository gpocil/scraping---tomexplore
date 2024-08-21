import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import https from 'https';
import fs from 'fs';
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

// Load SSL certificate and key
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/monblogdevoyage.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/monblogdevoyage.com/fullchain.pem')
};

const allowedOrigins = [
    'https://localhost:3001',
    'https://localhost:3001/login',
    'https://localhost',
    'https://37.187.35.37:3001',
    'https://37.187.35.37:3001/login',
    'https://37.187.35.37',
    'https://37.187.35.37:3000/api-docs',
    'https://37.187.35.37:3000',
    'https://localhost:3000/api-docs',
    'https://localhost:3000',
    'https://monblogdevoyage.com',
    'https://monblogdevoyage.com/api-docs',
    'http://localhost:3001',
    'http://localhost:3001/login',
    'http://localhost',
    'http://37.187.35.37:3001',
    'http://37.187.35.37:3001/login',
    'http://37.187.35.37',
    'http://37.187.35.37:3000/api-docs',
    'http://37.187.35.37:3000',
    'http://localhost:3000/api-docs',
    'http://localhost:3000',
    'http://monblogdevoyage.com',
    'http://monblogdevoyage.com/api-docs',
    '149.202.90.176',
    'https://tomexplore.com',
    'https://www.tomexplore.com'
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
app.use('/api', QueueRoutes);

//------------------------Auth required---------------------------------

app.use(jwtMiddleware);
app.use('/api/texplore', scrapingMainRoutes);
app.use('/api/texplore', texploreRoutes);
app.use('/api/unsplash', unsplashRoutes);
app.use('/api', InstagramRoutes);
app.use('/api', wikipediaRoutes);
app.use('/api', wikimediaRoutes);
app.use('/api', fileRoutes);
app.use('/api', googleRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'front-end/build')));

// The "catchall" handler: for any request that doesn't match one above, send back index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'front-end/build', 'index.html'));
});

sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');

        sequelize.sync()
            .then(() => {
                console.log('Database & tables created!');

                https.createServer(sslOptions, app).listen(port, '0.0.0.0', () => {
                    console.log(`Server running at https://localhost:${port}/api-docs`);
                });
            })
            .catch(err => {
                console.error('Unable to sync the database:', err);
            });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });
