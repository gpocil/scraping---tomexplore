import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import Place from './Place';

class Image extends Model {
    public id!: number;
    public image_name!: string;
    public original_url?: string;
    public place_id!: number;
    public top?: number;  // Ajouter cette ligne
}

Image.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    image_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    original_url: {
        type: DataTypes.STRING
    },
    place_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Place,
            key: 'id_tomexplore'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    top: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 3
        }
    }
}, {
    sequelize,
    modelName: 'Image',
    timestamps: false
});

Image.belongsTo(Place, { foreignKey: 'place_id', as: 'associatedPlace' });

export default Image;
