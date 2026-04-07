import { Sequelize } from 'sequelize';
import { config } from './config';

let sequelize: Sequelize;

if (config.dev === true) {
    sequelize = new Sequelize('scraping', 'root', '', {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql',
        pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
    });
} else {
    sequelize = new Sequelize('scraping', 'scraping', 'XQaGAwX3pHQ3', {
        host: '127.0.0.1',
        port: 3306,
        dialect: 'mysql',
        pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
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
