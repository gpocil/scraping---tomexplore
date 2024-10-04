import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import City from './City';
import User from './User';
import DailyRedactorStats from './DailyRedactorStats';
import Image from './Image';

class Place extends Model {
    public id_tomexplore!: number;
    public name_eng!: string;
    public name_original?: string;
    public type!: string;
    public city_id!: number;
    public checked!: boolean;
    public folder!: string;
    public wikipedia_link?: string;
    public unsplash_link?: string;
    public instagram_link?: string;
    public google_maps_link?: string;
    public needs_attention?: Boolean;
    public to_be_deleted?: Boolean;
    public details?: string;
    public last_modification!: Date;
    public instagram_updated?: boolean;
    public timestamp_start?: Date;
    public timestamp_end?: Date;
    public redactor_id?: number;
}

Place.init({
    id_tomexplore: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name_eng: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name_original: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    city_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: City,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    checked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    needs_attention: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    to_be_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    instagram_updated: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    folder: {
        type: DataTypes.STRING,
        allowNull: false
    },
    wikipedia_link: {
        type: DataTypes.STRING
    },
    unsplash_link: {
        type: DataTypes.STRING
    },
    google_maps_link: {
        type: DataTypes.STRING
    },
    instagram_link: {
        type: DataTypes.STRING
    },
    details: {
        type: DataTypes.STRING
    },
    last_modification: {
        type: DataTypes.DATE,
        allowNull: false
    },
    timestamp_start: {
        type: DataTypes.DATE,
        allowNull: true
    },
    timestamp_end: {
        type: DataTypes.DATE,
        allowNull: true
    },
    redactor_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Place',
    timestamps: false
});



Place.afterUpdate(async (place, options) => {
    if (place.timestamp_end && place.timestamp_start && place.redactor_id) {
        const redactorId = place.redactor_id;
        const startTime = new Date(place.timestamp_start).getTime();
        const endTime = new Date(place.timestamp_end).getTime();
        const timeSpent = (endTime - startTime) / 1000;

        // Mise à jour des statistiques de l'utilisateur
        const user = await User.findByPk(redactorId);
        if (user) {
            if (place.needs_attention) {
                user.places_needing_att_checked += 1;
            }
            user.total_places += 1;
            user.total_time_spent += timeSpent;
            user.avg_time_per_place = user.total_time_spent / user.total_places;
            await user.save();
        }

        const today = new Date().toISOString().slice(0, 10);
        const dailyStats = await DailyRedactorStats.findOne({ where: { redactor_id: redactorId, day: today } });

        if (dailyStats) {
            if (place.needs_attention) {
                dailyStats.places_needing_att += 1;
            }
            dailyStats.total_places += 1;
            dailyStats.total_time_spent += timeSpent;
            dailyStats.avg_time_per_place = dailyStats.total_time_spent / dailyStats.total_places;
            await dailyStats.save();
        } else {
            await DailyRedactorStats.create({
                redactor_id: redactorId,
                day: today,
                places_needing_att: place.needs_attention ? 1 : 0,
                total_places: 1,
                total_time_spent: timeSpent,
                avg_time_per_place: timeSpent,
            });
        }

        if (place.needs_attention) {
            place.needs_attention = false;
            await place.save({ hooks: false }); // Désactiver les hooks pour éviter une boucle infinie
        }
    }
});

export interface PlaceWithImages extends Place {
    images: Image[];
}



export default Place;
