import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import instagramRoutes from './routes/InstagramRoutes';
import googleRoutes from './routes/GoogleRoutes';
import photosRoutes from './routes/BusinessRoutes';


const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/google', googleRoutes);
app.use('', instagramRoutes);
app.use('', photosRoutes);


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
