import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';

class Country extends Model {
  public id!: number;
  public name!: string;

  static async createCountry(data: Partial<Country>) {
    return Country.create(data);
  }

  static async getCountries() {
    return Country.findAll();
  }

  static async getCountryById(id: number) {
    return Country.findByPk(id);
  }

  static async updateCountry(id: number, data: Partial<Country>) {
    await Country.update(data, { where: { id } });
    return Country.findByPk(id);
  }

  static async deleteCountry(id: number) {
    return Country.destroy({ where: { id } });
  }
}

Country.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Country',
  timestamps: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci'
});

export default Country;
