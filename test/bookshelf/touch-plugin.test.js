const env = process.env.NODE_ENV;

if (env !== 'test') {
  throw new Error('Tests must be run in test env'); 
}

const log = require('mk-log');
const clearTable = require('./utils/clear-table');
const wait = require('../utils/wait');
const TestPersonModel = require('./models/test-person-model');
const AdapterTestHelpers = require('mk-adapter-test-helpers');
//const Moment = require('moment-timezone');
//const Moment = require('moment');
//const dateFormat = 'YYYY-MM-DD HH:mm:ss'; 
//const qs = require('qs');
const tape = require('tape');
const {
  create,
} = require('../../lib/bookshelf-adapter.js')(TestPersonModel, {listKey: 'items'});

const testPesonFixtureA = {
  created_at: null,
  parent_id: 0, 
  //updated_at: null,
  //first_name: 'TestUpdateA',
  last_name: 'TestUpdateLastNameA'
};

const testPesonFixtureB = {
  created_at: null,
  updated_at: null,
  first_name: 'TestUpdateFirstNameB',
  parent_id: 1, 
  last_name: 'TestUpdateLastNameB'
};


async function main() {



  await tape('Touch Plugin Test', async function(t) {
    
    try {
      await clearTable(TestPersonModel);

      const {req, res} = AdapterTestHelpers();
      req.body = testPesonFixtureA; 
      await create(req, res);
      req.body = testPesonFixtureB; 
      await create(req, res);
      await wait(1100);


      const initialRecord = await TestPersonModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch({require: false});
     
      await initialRecord.touch(); 

      const touchedRecordA = await TestPersonModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch({require: false});
     
      t.true(initialRecord.attributes.updated_at < touchedRecordA.attributes.updated_at, 'increased updated_at through record object');

      await wait(1100);
      await new TestPersonModel({id: initialRecord.attributes.id}).touch(); 
      const touchedRecordB = await TestPersonModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch({require: false});
      
      t.true(touchedRecordA.attributes.updated_at < touchedRecordB.attributes.updated_at, 'increased updated_at through new model');
     

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  

}

main();
