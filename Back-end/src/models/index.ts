import Country from './Country';
import City from './City';
import Place from './Place';
import Image from './Image';
import User from './User';
import Queue from './Queue';
import DailyRedactorStats from './DailyRedactorStats';

Country.hasMany(City, { foreignKey: 'country_id', as: 'cities' });
City.belongsTo(Country, { foreignKey: 'country_id', as: 'country' });

City.hasMany(Place, { foreignKey: 'city_id', as: 'places' });
Place.belongsTo(City, { foreignKey: 'city_id', as: 'city' });

Place.hasMany(Image, { foreignKey: 'place_id', as: 'images' });
Image.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

User.hasMany(DailyRedactorStats, { foreignKey: 'redactor_id', as: 'stats' });
DailyRedactorStats.belongsTo(User, { foreignKey: 'redactor_id', as: 'user' });
Place.belongsTo(City, { foreignKey: 'city_id', as: 'associatedCity' });
Image.belongsTo(Place, { foreignKey: 'place_id', as: 'associatedPlace' });

export {
    Country,
    City,
    Place,
    Image,
    User,
    Queue,
    DailyRedactorStats
};
