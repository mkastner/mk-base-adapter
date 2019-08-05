const env = process.env.NODE_ENV;

if (env !== 'test') {
  throw new Error('Tests must be run in test env'); 
}

const log = require('mk-log');
const clearTable = require('./utils/clear-table');
const wait = require('./utils/wait');
const TestItemModel = require('./db-bookshelf/models/test-item-model');
const AdapterTestHelpers = require('mk-adapter-test-helpers');
//const Moment = require('moment-timezone');
//const Moment = require('moment');
//const dateFormat = 'YYYY-MM-DD HH:mm:ss'; 
//const qs = require('qs');
const tape = require('tape');
const {
  create,
} = require('../lib/bookshelf-adapter.js')(TestItemModel, {listKey: 'items'});

const testItemFixtureA = {
  created_at: null,
  parent_id: 0, 
  //updated_at: null,
  //first_name: 'TestUpdateA',
  last_name: 'TestUpdateLastNameA'
};

const testItemFixtureB = {
  created_at: null,
  updated_at: null,
  first_name: 'TestUpdateFirstNameB',
  parent_id: 1, 
  last_name: 'TestUpdateLastNameB'
};


async function main() {



  await tape('Touch Plugin Test', async function(t) {
    
    try {
      await clearTable(TestItemModel);

      const {req, res} = AdapterTestHelpers();
      req.body = testItemFixtureA; 
      await create(req, res);
      req.body = testItemFixtureB; 
      await create(req, res);
      await wait(1100);


      const initialRecord = await TestItemModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch();
      await initialRecord.touch(); 
      const touchedRecordA = await TestItemModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch();
     
      t.true(initialRecord.attributes.updated_at < touchedRecordA.attributes.updated_at, 'increased updated_at through record object');

      await wait(1100);
      await new TestItemModel({id: initialRecord.attributes.id}).touch(); 
      const touchedRecordB = await TestItemModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch();
      
      t.true(touchedRecordA.attributes.updated_at < touchedRecordB.attributes.updated_at, 'increased updated_at through new model');
     

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  

}

main();
