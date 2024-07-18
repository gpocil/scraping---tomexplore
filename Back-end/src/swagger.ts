const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API scraping TomExplore',
            version: '1.0.0',
            description: 'API de récupération d\'images de lieux touristiques + établissements recevant du public',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Adjust paths to your routes and controllers
};

export default swaggerOptions;
