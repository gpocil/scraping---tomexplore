import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import Place from './Place';

class Image extends Model {
    public id!: number;
    public image_name!: string;
    public original_url?: string;
    public source!: string;
    public place_id!: number;
    public license?: string;
    public author?: string;
    public top?: number;

    static async createImage(data: Partial<Image>) {
        return Image.create(data);
    }

    static async getImages() {
        return Image.findAll();
    }

    static async getImageById(id: number) {
        return Image.findByPk(id);
    }

    static async updateImage(id: number, data: Partial<Image>) {
        await Image.update(data, { where: { id } });
        return Image.findByPk(id);
    }

    static async deleteImage(id: number) {
        return Image.destroy({ where: { id } });
    }
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
    source: {
        type: DataTypes.STRING,
        allowNull: false
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
    license: {
        type: DataTypes.STRING
    },
    author: {
        type: DataTypes.STRING
    },
    top: {
        type: DataTypes.INTEGER
    }
}, {
    sequelize,
    modelName: 'Image',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

Image.belongsTo(Place, { foreignKey: 'place_id' });

export default Image;
