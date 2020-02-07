const log = require('mk-log');
const TestPersonModel = require('./models/test-person-model');
//const wait = require('./utils/wait');
const clearTable = require('./utils/clear-table');
//const Moment = require('moment-timezone');
//const Moment = require('moment');
//const dateFormat = 'YYYY-MM-DD HH:mm:ss'; 
//const qs = require('qs');
const tape = require('tape');

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

  if (!(process.env.NODE_ENV === 'test')) {
    return Promise.reject(new Error(`Tests must be run in NODE_ENV=test but not in env ${process.env.NODE_ENV}`)); 
  }


  await tape('Adapter Base create', async function(t) {
    
    try {
      await clearTable(TestPersonModel);
     
      let rawLatestRecord = await TestPersonModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch({require: false});
      //log.info('rawLatestRecord', rawLatestRecord);
      
      //await wait(1000);
      
      const listA = [testItemFixtureA, testItemFixtureB];
      await TestPersonModel.batchUpdate(listA);

   
      // if there are already records find the ones newer
      // than rawLatestRecord
      let rawCreatedRecords;
      if (rawLatestRecord) {
        const latestRecord = rawLatestRecord.toJSON();
        rawCreatedRecords = await TestPersonModel.query(qb => {
          qb.where('created_at', '>', latestRecord.created_at);
        }).fetchAll({require: false});
      } else {
        rawCreatedRecords = await TestPersonModel.query(qb => {
          qb.where('id', '>', 0);
        }).fetchAll({require: false});
      } 

      const createdRecords = rawCreatedRecords.toJSON();
    
      log.debug(createdRecords.length);

      t.equals(createdRecords.length, 2, 'records should be created');

      rawLatestRecord = await TestPersonModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch();


      //await wait(100);

      //const listB = [testItemFixtureA, testItemFixtureB];

      for (let i = 0, l = createdRecords.length; i < l; i++) {
        delete createdRecords[i].created_at;
        delete createdRecords[i].updated_at;
      }

      //const resultB = 
      await TestPersonModel.batchUpdate(createdRecords);
      //log.info('resultB', resultB);
      //const latestUpdatedRecord = rawLatestRecord.toJSON();
      const rawUpdatedRecords = await TestPersonModel.query(qb => {
        qb.where('id', '>', 0);
      }).fetchAll();
     
      const updatedRecords = rawUpdatedRecords.toJSON();

      //log.info('updatedRecords', updatedRecords);

      t.equal(updatedRecords.length, 2, 'records should be updated');


    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  

}

main();
