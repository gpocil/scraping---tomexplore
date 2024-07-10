import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import instagramRoutes from './routes/InstagramRoutes';
import googleRoutes from './routes/GoogleRoutes';
import scrapingMainRoutes from './routes/ScrapingMainRoutes';
import fileRoutes from './routes/FileRoutes';
import wikiRoutes from './routes/WikipediaRoutes'


const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/google', googleRoutes);
app.use('', instagramRoutes);
app.use('', scrapingMainRoutes);
app.use('', fileRoutes)
app.use('', wikiRoutes)


app.listen(port, () => {
    console.log('Server running at http://localhost:${port}');
});
