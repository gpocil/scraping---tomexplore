import Country from './Country';
import City from './City';
import Place from './Place';
import Image from './Image';
import User from './User';
import Queue from './Queue';
import Event from './Event';
import DailyRedactorStats from './DailyRedactorStats';

Country.hasMany(City, { foreignKey: 'country_id', as: 'cities' });
City.belongsTo(Country, { foreignKey: 'country_id', as: 'country' });

City.hasMany(Place, { foreignKey: 'city_id', as: 'places' });
Place.belongsTo(City, { foreignKey: 'city_id', as: 'city' });

Place.hasMany(Image, { foreignKey: 'place_id', as: 'images' });
Image.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

User.hasMany(DailyRedactorStats, { foreignKey: 'redactor_id', as: 'stats' });
DailyRedactorStats.belongsTo(User, { foreignKey: 'redactor_id', as: 'user' });
Image.belongsTo(Place, { foreignKey: 'place_id', as: 'associatedPlace' });

Country.hasMany(Event, { foreignKey: 'country_id', as: 'events' });
City.hasMany(Event, { foreignKey: 'city_id', as: 'events' });
Place.hasMany(Event, { foreignKey: 'place_id', as: 'events' });

Image.belongsTo(Event, { foreignKey: 'event_id', as: 'associatedEvent' });
Event.belongsTo(Country, { foreignKey: 'country_id', as: 'associatedCountry_event' });
Event.belongsTo(City, { foreignKey: 'city_id', as: 'associatedCity_event' });
Event.belongsTo(Place, { foreignKey: 'place_id', as: 'associatedPlace_event' });

Event.hasMany(Image, { foreignKey: 'event_id', as: 'images_event' });

export {
    Country,
    City,
    Place,
    Image,
    User,
    Queue,
    DailyRedactorStats,
    Event
};
