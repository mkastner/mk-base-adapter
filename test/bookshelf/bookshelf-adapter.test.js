const log = require('mk-log');
const TestItemModel = require('./models/test-item-model');
const clearTable = require('./utils/clear-table');
const wait = require('../utils/wait');
const Moment = require('moment-timezone');
//const Moment = require('moment');
const dateFormat = 'YYYY-MM-DD HH:mm:ss'; 
const qs = require('qs');
const tape = require('tape');
const {
  create,
  remove,
  removeMultiple,
  update,
  upsertMultiple, 
  read,
  list,
  touch
} = require('../../lib/bookshelf-adapter.js')(TestItemModel, {listKey: 'items'});

const AdapterTestHelpers = require('mk-adapter-test-helpers');

const testItemFixtureA = {
  parent_id: 1, 
  first_name: 'TestA',
  last_name: 'TestA'
};

const testItemFixtureB = {
  parent_id: 2, 
  first_name: 'TestB',
  last_name: 'TestB'
};

async function main() {

  if (!(process.env.NODE_ENV === 'test')) {
    return Promise.reject(new Error(`Tests must be run in NODE_ENV=test but not in env ${process.env.NODE_ENV}`)); 
  }

  await tape('Adapter Base create', async (t) => {
    
    try {
      await clearTable(TestItemModel);
      const {req, res} = AdapterTestHelpers();
      req.body = testItemFixtureA; 
      await create(req, res);
      const createdModel = res.data;

      t.equals(req.body.email, createdModel.email, 'created model with field email');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });

  await tape('Adapter Base touch', async (t) => {
    
    try {
      await clearTable(TestItemModel);

      const createdModel = await new TestItemModel(testItemFixtureA).save();

      const initialUpdate = createdModel.toJSON().updated_at;
      const id = createdModel.id;
    
      await wait(1100);
      
      const {req, res} = AdapterTestHelpers();

      req.params.id = id;
      await touch(req, res);

      const touchedModel = res.data;
      const touchedUpdate = touchedModel.updated_at;

      t.true(initialUpdate < touchedUpdate, 'model updated_at was touched');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base upsertMultiple', async (t) => {
    
    try {
      await clearTable(TestItemModel);
      // don't clear: need to check wheter timestamp for
      // latest record before created works 
      const {req, res} = AdapterTestHelpers();
      req.body = [testItemFixtureA, testItemFixtureB];

      const countBefore =  await TestItemModel.count();

      await upsertMultiple(req, res);
      
      const countAfter = await TestItemModel.count();

      log.debug('res.data', res.data);

      t.equals(countAfter - countBefore, 2, 'created multiple records');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base remove', async (t) => {
    try {
      await clearTable(TestItemModel);
      const {req, res} = AdapterTestHelpers();
      const createdModel = await new TestItemModel(testItemFixtureA).save();
      const id = createdModel.id;
      req.params.id = id;
      await remove(req, res);
      const removedUser = await TestItemModel.where({id}).fetch();

      t.notOk(removedUser, 'should be removed');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base removeMultiple', async (t) => {
    try {
      await clearTable(TestItemModel);
      const {req, res} = AdapterTestHelpers();
      const createdModelA = await new TestItemModel(testItemFixtureA).save();
      const idA = createdModelA.id;
      const createdModelB = await new TestItemModel(testItemFixtureA).save();
      const idB = createdModelB.id;
      //req.params.id = `${idA}+${idB}`; 
      req.body = [idA, idB]; 
      await removeMultiple(req, res);
      let remainingUsers = await TestItemModel.where('id', '>=', 0).fetchAll();

      t.equals(remainingUsers.toJSON().length, 0, 'should be removed');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base read', async (t) => {
    try {
      const {req, res} = AdapterTestHelpers();
      const createdModel = await new TestItemModel(testItemFixtureA).save();
      const id = createdModel.id;
      req.params.id = id;
      await read(req, res);
      let readUser = await TestItemModel.where({id}).fetch();

      t.equals(id, readUser.id, 'should be read');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });

  await tape('Adapter Base list', async (t) => {
    
    try {

      await clearTable(TestItemModel);
    
      let {req, res} = AdapterTestHelpers();
      
      await new TestItemModel(testItemFixtureA).save();
      const createdModelB = await new TestItemModel(testItemFixtureB).save();
      req.query = `search[first_name]=${createdModelB.toJSON().first_name}&search[last_name]=${createdModelB.toJSON().last_name}`; 
      
      log.debug('rea.query', req.query);

      await list(req, res);

      log.debug('res.data', res.data);

      t.equals(1, res.data.items.length, 'item should be found');
      t.equals(testItemFixtureB.first_name, res.data.items[0].first_name, 'should be found');
      
      let helpers = AdapterTestHelpers();

      req = helpers.req;
      res = helpers.res;

      
      req.query = qs.stringify({ order: [{by: 'last_name', direction: 'DESC'}]}, 
        {encodeValuesOnly: true});

      //'order[0][by]=last_name&order[0][direction]=DESC';
     
      await list(req, res);

      t.ok(testItemFixtureB.last_name.toString().trim() === res.data.items[0].last_name.toString().trim(), 'should be sorted descending');
      
      await clearTable(TestItemModel);
    
      helpers = AdapterTestHelpers();
      req = helpers.req;
      res = helpers.res;
      
      const createdModelA = await new TestItemModel({first_name: 'ABC', last_name: 'XYZ'}).save();
      await wait(2000); 
      //const createdModelB = 
      await new TestItemModel(testItemFixtureB).save();
      const createdModelAData = createdModelA.toJSON(); 
      //const createdModelBData = createdModelB.toJSON(); 

      const momentDate = new Moment(createdModelAData.updated_at); 

      const updatedAt = Moment.tz(momentDate, 'Europe/Berlin').format(dateFormat);
      const encodedDate = encodeURIComponent(updatedAt);

      const query = qs.stringify({range: [{
        field: 'updated_at',
        val: encodedDate,
        comp: 'lt',
      }]}, {encodeValuesOnly: true});

      req.query = query;
      //req.query = `range[updated_at][gt]=${encodedDate}`;
      
      await list(req, res);

      t.true(createdModelAData.updated_at > res.data.items[0].updated_at, 
        'should be updated');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base update', async (t) => {
    
    try {
   
      await clearTable(TestItemModel);
    
      let {req, res} = AdapterTestHelpers();
      
      const createdModelA = await new TestItemModel(testItemFixtureA).save();
      const createdModelData = createdModelA.toJSON(); 

      //log.info('createdModelData', createdModelData);

      req.params.id = createdModelData.id;
      req.body = {last_name: 'TestZ'};

      await update(req, res);
      
      t.equals(req.body.last_name,  res.data.last_name, 'should be updated');
      

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base hooks', async (t) => {
    
    try {
      const {
        list,
      } = require('../../lib/bookshelf-adapter.js')(TestItemModel, null, { list: { 
        query(qb) {
          qb.where({parent_id: 1});
        }
      }});
      await clearTable(TestItemModel);
      await new TestItemModel(testItemFixtureA).save();
      //const createdModelB = 
      await new TestItemModel(testItemFixtureB).save();
      
      let {req, res} = AdapterTestHelpers();

      await list(req, res, null, 
        { list: { 
          query(qb) {
            qb.where({parent_id: 1});
          }
        }});

      log.debug(res.data.docs);

      t.equal(res.data.docs.length, 1);

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });

}

main();
