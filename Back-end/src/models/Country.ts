import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';

class Country extends Model {
  public id!: number;
  public name!: string;
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
  timestamps: false
});

export default Country;
