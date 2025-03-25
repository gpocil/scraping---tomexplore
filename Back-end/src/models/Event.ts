import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import Country from './Country';
import City from './City';

enum EventType {
    event_recurring,
    event_ponctual
}

class Event extends Model {
    public id!: number;
    public name!: string;
    public country_id!: number;
}

Event.init({
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
    city_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: City,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    place_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Places',
            key: 'id'
        }
    },
    instagram_link: {
        type: DataTypes.STRING
    },
    facebook_link: {
        type: DataTypes.STRING
    },
    website_link: {
        type: DataTypes.STRING
    },
    price_range: {
        type: DataTypes.SMALLINT
    },
    event_type:
    {
        type: DataTypes.ENUM('event_recurring', 'event_ponctual')
    },
    event_date_start: {
        type: DataTypes.DATE
    },
    event_date_end: {
        type: DataTypes.DATE
    },
    day_of_the_week: {
        type: DataTypes.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
    },
    week_of_the_month: {
        type: DataTypes.ENUM('first', 'second', 'third', 'fourth', 'last')
    },
    event_category: {
        type: DataTypes.STRING
    },
    description: {
        type: DataTypes.TEXT
    },
    slug: {
        type: DataTypes.STRING
    },
    img_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Images',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    }

}, {
    sequelize,
    modelName: 'Event',
    timestamps: false
});

Event.belongsTo(Country, { foreignKey: 'country_id', as: 'associatedCountry' });

export default Event;
