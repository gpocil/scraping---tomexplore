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

import { jwtMiddleware } from './controllers/security/JWTController';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('', authRoutes);

app.use(jwtMiddleware);

app.use('', googleRoutes);
app.use('', instagramRoutes);
app.use('', scrapingMainRoutes);
app.use('', fileRoutes);
app.use('', wikiRoutes);
app.use('', unsplashRoutes);
app.use('', wikimediaRoutes);

app.listen(port, () => {
    console.log('Server running on port', port);
});
