import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';

class Queue extends Model {
    public id!: number;
    public id_tomexplore!: number;
    public name_en!: string;
    public name_fr?: string;
    public type!: string;
    public link_maps!: string;
    public instagram_username?: string;
    public address!: string;
    public city!: string;
    public country!: string;
    public famous?: boolean;
    public processed!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
}

Queue.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        id_tomexplore: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        name_en: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name_fr: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        link_maps: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        instagram_username: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        famous: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        processed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        sequelize,
        tableName: 'queue',
        timestamps: true,
        hooks: {
            beforeCreate: (queue: Queue) => {
                queue.type = queue.famous ? 'tourist_attraction' : 'business';
            },
            beforeUpdate: (queue: Queue) => {
                queue.type = queue.famous ? 'tourist_attraction' : 'business';
            }
        }
    }
);

export default Queue;
