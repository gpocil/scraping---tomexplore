import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';

class DailyRedactorStats extends Model {
    public id!: number;
    public redactor_id!: number;
    public day!: Date;
    public total_places!: number;
    public total_time_spent!: number;
    public avg_time_per_place!: number;
}

DailyRedactorStats.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    redactor_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    day: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    total_places: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    total_time_spent: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    avg_time_per_place: {
        type: DataTypes.FLOAT,
        allowNull: false
    },

}, {
    sequelize,
    modelName: 'RedactorStats',
    timestamps: false,
    tableName: 'redactor_stats'
});



export default DailyRedactorStats;
