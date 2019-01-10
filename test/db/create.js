const knexConfig = require('./knexfile');

const client = knexConfig.client;
const host = knexConfig.connection.host;
const database = knexConfig.connection.database;
const password = knexConfig.connection.password;
const user = knexConfig.connection.user;
const charset = knexConfig.connection.charset;

async function main() {

  let dbRoot = process.env.DB_TEST_ROOT;
  let dbRootPassword = process.env.DB_TEST_ROOT_PASSWORD;

  try {

    let knex = await require('knex')({
      client, 
      connection: { 
        user: dbRoot, 
        password: dbRootPassword, 
        charset, 
        host
      }
    });
     
    console.log(`creating database ${database}`); 

    let createScript = `CREATE DATABASE ${database} CHARACTER SET ${charset} COLLATE utf8_unicode_ci;`; 

    console.log('createScript', createScript);

    await knex.raw(createScript);
    
    let grantScript = `GRANT ALL ON ${database}.* to '${user}'@'${host}' IDENTIFIED BY '${password}';`;
    
    console.log('grantScript', createScript);
    await knex.raw(grantScript);

    knex.destroy();

    knex = require('knex')(knexConfig);
    knex.destroy();
  } catch (err) {
    console.error(err); 
  }

}

main();
