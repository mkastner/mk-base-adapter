const knexConfig = require('./knexfile');

const log = require('mk-log'); 
const client = knexConfig.client;
const host = knexConfig.connection.host;
const database = knexConfig.connection.database;
const password = knexConfig.connection.password;
const user = knexConfig.connection.user;
const charset = knexConfig.connection.charset;


async function main() {

  try {

    const knex = await require('knex')({
      client, 
      connection: { 
        user, 
        password, 
        charset, 
        host
      }
    });
     
    log.info(`creating database ${database}`); 

    let createScript = `CREATE DATABASE ${database} CHARACTER SET ${charset} COLLATE utf8_unicode_ci;`; 

    console.log('createScript', createScript);

    await knex.raw(createScript);
    
    let grantScript = `GRANT ALL ON ${database}.* to '${user}'@'${host}' IDENTIFIED BY '${password}';`;
    
    console.log('grantScript', createScript);
    await knex.raw(grantScript);

    knex.destroy();

    const knexReloaded = require('knex')(knexConfig);
    knexReloaded.destroy();
  } catch (err) {
    console.error(err); 
  }

}

main();
