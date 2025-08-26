// Database configuration
module.exports = {
  // database: {
  //   host: process.env.DB_HOST || 'localhost',
  //   port: process.env.DB_PORT || 5432,
  //   database: process.env.DB_NAME || 'testdb01',
  //   user: process.env.DB_USER || 'postgres',
  //   password: process.env.DB_PASSWORD || 'postgres', // Change this to your PostgreSQL password
  // },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'testdb01',
    user: 'postgres',
    password: 'postgres', // Change this to your PostgreSQL password
  },
  server: {
    port: process.env.PORT || 3001,
  }
};
