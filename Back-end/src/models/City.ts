import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import Country from './Country';

class City extends Model {
    public id!: number;
    public name!: string;
    public country_id!: number;
    public latitude!: number;
    public longitude!: number;
    public most_nw_lat!: number;
    public most_nw_lng!: number;
    public most_se_lat!: number;
    public most_se_lng!: number;
}

City.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    country_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Country,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    latitude: {
        type: DataTypes.FLOAT,
    },
    longitude: {
        type: DataTypes.FLOAT,
    },
    most_nw_lat: {
        type: DataTypes.FLOAT
    },
    most_nw_lng: {
        type: DataTypes.FLOAT
    },
    most_se_lat: {
        type: DataTypes.FLOAT
    },
    most_se_lng: {
        type: DataTypes.FLOAT
    }
}, {
    sequelize,
    modelName: 'City',
    tableName: 'cities',
    timestamps: false,
    indexes: [
        {
            name: 'country_id',
            fields: ['country_id']
        }
    ]
});

City.belongsTo(Country, { foreignKey: 'country_id', as: 'associatedCountry' });

export default City;
