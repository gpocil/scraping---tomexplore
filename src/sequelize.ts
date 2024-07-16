import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('capi3764_scraping', 'capi3764_scraping', 'CppYRxjJ5mbCjm$8', {
    host: 'capi3764.odns.fr',
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
