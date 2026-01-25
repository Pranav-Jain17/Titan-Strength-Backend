const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Titan Strength API',
    description: 'Automatically generated documentation'
  },
  host: process.env.SWAGGER_HOST || 'localhost:5000',
  schemes: [process.env.SWAGGER_SCHEME || 'http'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Enter your bearer token in the format **Bearer <token>**'
    }
  }
};

const outputFile = './swagger-output.json';

const routes = ['./server.js'];

swaggerAutogen(outputFile, routes, doc);
