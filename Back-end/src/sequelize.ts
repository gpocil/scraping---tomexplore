import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('scraping', 'root', '', {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql'
});

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

export default sequelize;
