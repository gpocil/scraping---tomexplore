import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import Country from './Country';

class City extends Model {
    public id!: number;
    public name!: string;
    public country_id!: number;

    static async createCity(data: Partial<City>) {
        return City.create(data);
    }

    static async getCities() {
        return City.findAll();
    }

    static async getCityById(id: number) {
        return City.findByPk(id);
    }

    static async updateCity(id: number, data: Partial<City>) {
        await City.update(data, { where: { id } });
        return City.findByPk(id);
    }

    static async deleteCity(id: number) {
        return City.destroy({ where: { id } });
    }
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
    }
}, {
    sequelize,
    modelName: 'City',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

City.belongsTo(Country, { foreignKey: 'country_id' });

export default City;
