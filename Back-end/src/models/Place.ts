import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import City from './City';

class Place extends Model {
    public id_tomexplore!: number;
    public name_eng!: string;
    public type!: string;
    public city_id!: number;
    public checked!: boolean;
    public folder!: string;
    public wikipedia_link?: string;
    public unsplash_link?: string;
    public instagram_link?: string;

    public google_maps_link?: string;
    public needs_attention?: Boolean;
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
    }
}, {
    sequelize,
    modelName: 'Place',
    timestamps: false
});

Place.belongsTo(City, { foreignKey: 'city_id', as: 'associatedCity' });

export default Place;
