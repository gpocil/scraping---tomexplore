import { Request, Response } from 'express';
import Place from '../../models/Place';
import User from '../../models/User';
import DailyRedactorStats from '../../models/DailyRedactorStats';

export async function updatePlaceStart(req: Request, res: Response): Promise<void> {
    const { placeId, userId } = req.body;

    try {
        if (!placeId || !userId) {
            res.status(400).json({ message: 'placeId and userId are required' });
            return;
        }
        const place = await Place.findByPk(placeId);
        if (!place) {
            res.status(404).json({ message: 'Place not found' });
            return;
        }
        if (place.timestamp_end) {
            res.status(404).json({ message: 'Place already done' });
            return;
        }
        const user = await User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        place.timestamp_start = new Date();
        place.timestamp_end = null as any;
        place.redactor_id = userId;

        await place.save();
        res.status(200).json({
            message: 'Place updated successfully',
            place: {
                id: place.id_tomexplore,
                timestamp_start: place.timestamp_start,
                redactor_id: place.redactor_id,
            },
        });
    } catch (error: any) {
        console.error('Error updating place:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}


export async function updatePlaceEnd(req: Request, res: Response): Promise<void> {
    const { placeId } = req.body;

    try {
        if (!placeId) {
            res.status(400).json({ message: 'placeId is required' });
            return;
        }
        const place = await Place.findByPk(placeId);
        if (!place) {
            res.status(404).json({ message: 'Place not found' });
            return;
        }
        if (!place.timestamp_start) {
            console.warn(`No start timestamp found for place ID ${place.id_tomexplore}`);
            res.status(400).json({ message: 'Start timestamp missing' });
            return;
        }
        if (place.timestamp_end) {
            console.warn(`Place already finished ${place.id_tomexplore}`);
            res.status(400).json({ message: 'end timestamp already there missing' });
            return;
        }

        place.timestamp_end = new Date();
        await place.save();


        res.status(200).json({
            message: 'Place updated successfully',
            place: {
                id: place.id_tomexplore,
                timestamp_end: place.timestamp_end,
            },
        });
    } catch (error: any) {
        console.error('Error updating place:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export async function updatePlaceAbort(req: Request, res: Response): Promise<void> {
    const { placeId } = req.body;

    try {
        if (!placeId) {
            res.status(400).json({ message: 'placeId is required' });
            return;
        }

        const place = await Place.findByPk(placeId);
        if (!place) {
            res.status(404).json({ message: 'Place not found' });
            return;
        }

        place.redactor_id = null as any;
        place.timestamp_start = null as any;
        place.timestamp_end = null as any;


        await place.save();

        res.status(200).json({
            message: 'Place aborted successfully',
            place: {
                id: place.id_tomexplore,
                redactor_id: place.redactor_id,
                timestamp_start: place.timestamp_start,
            },
        });
    } catch (error: any) {
        console.error('Error aborting place:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}


export async function getUsersInfo(req: Request, res: Response): Promise<void> {
    try {
        const users = await User.findAll({
            where: {
                admin: false
            },
            attributes: ['id', 'login', 'total_places', 'total_time_spent', 'avg_time_per_place'],
        });

        if (!users || users.length === 0) {
            res.status(404).json({ message: 'No users found' });
            return;
        }

        const usersInfo = await Promise.all(
            users.map(async (user) => {
                // Récupérer les statistiques journalières
                const dailyStats = await DailyRedactorStats.findAll({
                    where: {
                        redactor_id: user.id
                    },
                    attributes: ['id', 'redactor_id', 'day', 'total_places', 'total_time_spent', 'avg_time_per_place', 'places_needing_att']
                });

                // Filtrer les jours uniques pour éviter les doublons
                const uniqueDailyStats = dailyStats.reduce((acc: DailyRedactorStats[], stat) => {
                    if (!acc.some(item => item.day === stat.day)) {
                        acc.push(stat);
                    }
                    return acc;
                }, []);

                // Récupérer les lieux vérifiés
                const verifiedPlaces = await Place.findAll({
                    where: {
                        redactor_id: user.id,
                    },
                    attributes: ['id_tomexplore', 'name_eng', 'timestamp_start', 'timestamp_end', 'has_needed_attention']
                });

                return {
                    id: user.id,
                    login: user.login,
                    total_places: user.total_places,
                    total_time_spent: user.total_time_spent,
                    avg_time_per_place: user.avg_time_per_place,
                    dailyStats: uniqueDailyStats,
                    verifiedPlaces: verifiedPlaces
                };
            })
        );

        res.status(200).json(usersInfo);
    } catch (error: any) {
        console.error('Error fetching user information:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
