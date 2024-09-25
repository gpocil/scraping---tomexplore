import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';

class User extends Model {
    public id!: number;
    public login!: string;
    public password!: string;
    public admin!: boolean;
    public total_places!: number;
    public places_needing_att_checked!: number;
    public total_time_spent!: number;
    public avg_time_per_place!: number;
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
    },
    admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    total_places: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    places_needing_att_checked: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    total_time_spent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0 //  seconds
    },
    avg_time_per_place: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0 //  seconds
    }
}, {
    sequelize,
    modelName: 'User',
    timestamps: false
});

export default User;
