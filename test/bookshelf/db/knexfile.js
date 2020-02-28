const EnvVars = require('mk-env-vars');
const envVars = EnvVars({deploy: 'TEST'});

module.exports = {
  client: 'mysql',
  connection: {
    host     : envVars('MYSQLHOST'),
    user     : envVars('DBUSER'),
    password : envVars('DBPASSWORD'),
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

