import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import City from './City';

class Place extends Model {
    public id_tomexplore!: number;
    public name_fr?: string;
    public name_eng!: string;
    public type!: string;
    public city_id!: number;
    public checked!: boolean;
    public folder!: string;
    public instagram_link?: string;
    public google_maps_link?: string;
    public unsplash_link?: string;
    public wikipedia_link?: string;

    static async createPlace(data: Partial<Place>) {
        return Place.create(data);
    }

    static async getPlaces() {
        return Place.findAll();
    }

    static async getPlaceById(id: number) {
        return Place.findByPk(id);
    }

    static async updatePlace(id: number, data: Partial<Place>) {
        await Place.update(data, { where: { id_tomexplore: id } });
        return Place.findByPk(id);
    }

    static async deletePlace(id: number) {
        return Place.destroy({ where: { id_tomexplore: id } });
    }
}

Place.init({
    id_tomexplore: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name_fr: {
        type: DataTypes.STRING
    },
    name_eng: {
        type: DataTypes.STRING,
        allowNull: false
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
        allowNull: true
    },
    folder: {
        type: DataTypes.STRING,
        allowNull: true
    },
    instagram_link: {
        type: DataTypes.STRING,
        allowNull: true
    },
    google_maps_link: {
        type: DataTypes.STRING,
        allowNull: true
    },
    unsplash_link: {
        type: DataTypes.STRING,
        allowNull: true
    },
    wikipedia_link: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Place',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

Place.belongsTo(City, { foreignKey: 'city_id' });

export default Place;
