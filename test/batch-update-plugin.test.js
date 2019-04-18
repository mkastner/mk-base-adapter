const log = require('mk-log');
const TestItemModel = require('./db/models/test-item-model');
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

function wait(milliseconds) {

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds); 
  });

}

async function clearTable() {
  try {
    let result = await TestItemModel.where('id', '>', 0);
    let count = await result.count();
    if (count > 0) {
      await TestItemModel.where('id', '>', 0).destroy();
    }
  } catch (err) {
    log.error(err);
    return Promise.reject(err); 
  }
}

async function main() {

  if (!(process.env.NODE_ENV === 'test')) {
    return Promise.reject(new Error(`Tests must be run in NODE_ENV=test but not in env ${process.env.NODE_ENV}`)); 
  }


  await tape('Adapter Base create', async function(t) {
    
    try {
      await clearTable();
     
      let rawLatestRecord = await TestItemModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch();
      log.info('rawLatestRecord', rawLatestRecord);
      
      //await wait(1000);
      
      const listA = [testItemFixtureA, testItemFixtureB];
      const result = await TestItemModel.batchUpdate(listA);

      log.info('&&&&&&&&&&&&&& result', result);
   
      // if there are already records find the ones newer
      // than rawLatestRecord
      let rawCreatedRecords;
      if (rawLatestRecord) {
        const latestRecord = rawLatestRecord.toJSON();
        rawCreatedRecords = await TestItemModel.query(qb => {
          qb.where('created_at', '>', latestRecord.created_at);
        }).fetchAll();
      } else {
        rawCreatedRecords = await TestItemModel.query(qb => {
          qb.where('id', '>', 0);
        }).fetchAll();
      } 

      const createdRecords = rawCreatedRecords.toJSON();
    
      log.info(createdRecords.length);

      t.equals(createdRecords.length, 2, 'records should be created');


      rawLatestRecord = await TestItemModel.query(qb => {
        qb.orderBy('created_at', 'DESC');
        qb.limit(1);
      }).fetch();


      //await wait(100);

      //const listB = [testItemFixtureA, testItemFixtureB];

      for (let i = 0, l = createdRecords.length; i < l; i++) {
        delete createdRecords[i].created_at;
        delete createdRecords[i].updated_at;
      }

      const resultB = await TestItemModel.batchUpdate(createdRecords);
      log.info('resultB', resultB);
      //const latestUpdatedRecord = rawLatestRecord.toJSON();
      const rawUpdatedRecords = await TestItemModel.query(qb => {
        qb.where('id', '>', 0);
      }).fetchAll();
     
      const updatedRecords = rawUpdatedRecords.toJSON();

      log.info('updatedRecords', updatedRecords);

      t.equal(updatedRecords.length, 2, 'records should be updated');


    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  

}

main();
