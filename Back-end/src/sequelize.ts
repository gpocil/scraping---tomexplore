import { Sequelize } from 'sequelize';
import { config } from './config';

let sequelize: Sequelize;

if (config.dev === true) {
    sequelize = new Sequelize('scraping', 'root', '', {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql'
    });
} else {
    sequelize = new Sequelize('scraping', 'scraping', 'XQaGAwX3pHQ3', {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql'
    });
}

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

export default sequelize;
