import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';

class User extends Model {
    public id!: number;
    public login!: string;
    public password!: string;
}

User.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    login: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'User',
    timestamps: false
});

export default User;
