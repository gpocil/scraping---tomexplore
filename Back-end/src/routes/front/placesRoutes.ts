import { Router } from 'express';
import Place from '../../models/Place';

const router = Router();

// Endpoint pour récupérer le folder d'un lieu spécifique
router.get('/placeImages/:placeId', async (req, res) => {
    try {
        const placeId = req.params.placeId;
        const place = await Place.findByPk(placeId, {
            attributes: ['folder']
        });
        if (place) {
            res.json({ folder: place.folder });
        } else {
            res.status(404).json({ error: 'Place not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the folder' });
    }
});

export default router;
