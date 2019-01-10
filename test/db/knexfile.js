module.exports = {
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : process.env.DB_TEST_USER,
    password : process.env.DB_TEST_USER_PASSWORD,
    database : 'mk_base_adapter_test',
    charset  : 'utf8'
  },
  debug: false,
  pool: {
    min: 1,
    max: 3
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  }
};

