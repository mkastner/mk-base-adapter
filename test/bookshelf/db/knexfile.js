module.exports = {
  client: 'mysql',
  connection: {
    host     : '10.66.66.16',
    user     : process.env.DB_TEST_USER,
    password : process.env.DB_TEST_USER_PASSWORD,
    database : 'mk_base_adapter_test',
    charset  : 'utf8',
    preciseTimestamps: true
  },
  debug: false,
  pool: {
    min: 0,
    max: 30 
  },
  migrations: {
    directory: '../migrations',
    tableName: 'knex_migrations'
  }
};

