const env = process.env.NODE_ENV;
if (env !== 'test') {
  throw new Error('Tests must be run in test env');
}

const log = require('mk-log');
const TestPersonModel = require('./models/test-person-model');
const clearTable = require('./utils/clear-table');
const wait = require('../utils/wait');
//const Moment = require('moment-timezone');
//const Moment = require('moment');
//const dateFormat = 'YYYY-MM-DD HH:mm:ss'; 
//const qs = require('qs');
const tape = require('tape');
const AdapterTestHelpers = require('mk-adapter-test-helpers');

const {
  create,
  remove,
  removeMultiple,
  update,
  upsertMultiple, 
  read,
  list,
  touch } = require('../../lib/mongoose-adapter.js')(TestPersonModel, { listKey: 'items' });

const testPersonFixtureA = {
  firstName: 'TestA',
  lastName: 'TestA'
};

const testPersonFixtureB = {
  firstName: 'TestBfirstName',
  lastName: 'TestBLastName'
};

tape('Mongoose adapter create', async (t) => {
   
  await clearTable(TestPersonModel);

  try {
    await clearTable(TestPersonModel);
    const helperA = AdapterTestHelpers();
    const reqA = helperA.req;
    const resA = helperA.res;

    reqA.body = testPersonFixtureA; 
    await create(reqA, resA);
    const createdModel = resA.data;
    t.equals(reqA.body.last_name, createdModel.last_name, 'created model with field last_name');
    
    const helperB = AdapterTestHelpers();
    const reqB = helperB.req;
    const resB = helperB.res;
    reqB.body = {
      firstName: '',
      lastName: ''
    };
    await create(reqB, resB);

    t.ok(resB.data.error.name === 'ValidationError', 'ValidationError on missing Fields');


  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }
});

tape('Mongoose Adapter update', async (t) => {
  
  try {
 
    await clearTable(TestPersonModel);
  
    const helperA = AdapterTestHelpers();
    const reqA = helperA.req;
    const resA = helperA.res;

    const createdModelData = await new TestPersonModel(testPersonFixtureA).save();
    
    reqA.params.id = createdModelData.id;
    reqA.body = {lastName: 'TestZ'};

    await update(reqA, resA);
    
    t.equals(reqA.body.last_name,  resA.data.last_name, 'should be updated');
  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }
});

tape('Mongoose Adapter list', async (t) => {
  
  try {
 
    await clearTable(TestPersonModel);
  
    let {req, res} = AdapterTestHelpers();
    await new TestPersonModel(testPersonFixtureA).save();
    const createdModelB = await new TestPersonModel(testPersonFixtureB).save();

    req.query = `search[firstName]=${createdModelB.firstName}&search[lastName]=${createdModelB.lastName}`; 

    await list(req, res);

    t.ok(res.data.items.length >= 1, 'should have docs');
  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }
});

tape('Mongoose Adapter upsertMultiple', async (t) => {
  
  try {
 
    await clearTable(TestPersonModel);
  
    let {req, res} = AdapterTestHelpers();
    const createdModelA = await new TestPersonModel(testPersonFixtureA).save();
    //const createdModelA = await new TestPersonModel(testPersonFixtureB).save();

    req.body = [createdModelA, testPersonFixtureB];
    await upsertMultiple(req, res);
    t.equals(res.data.length,  2, 'one should be created');
 
    createdModelA.lastName = 'XPander';
    req.body = [createdModelA];
    await upsertMultiple(req, res);
    t.equals(res.data.length,  1, 'one should be changed');
   
  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }
});

tape('Mongoose Adapter remove', async (t) => {
  
  try {
    await clearTable(TestPersonModel);
    const createdModelA = await new TestPersonModel(testPersonFixtureA).save();
    let {req, res} = AdapterTestHelpers();
    req.params.id = createdModelA._id;
    await remove(req, res);
    const removeResult = res.data;

    t.ok(removeResult.ok,  'should be deleted');
  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }

});

tape('Mongoose Adapter removeMany', async (t) => {
  
  try {
    await clearTable(TestPersonModel);
    const createdModelA = await new TestPersonModel(testPersonFixtureA).save();
    await new TestPersonModel(testPersonFixtureA).save();
    await new TestPersonModel(testPersonFixtureB).save();
    let {req, res} = AdapterTestHelpers();
    req.body.ids = [createdModelA._id];
    await removeMultiple(req, res);
    const removeResult = res.data;
    t.ok(removeResult.deletedCount === 1,  'one should be deleted');
  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }

});

tape('Mongoose Adapter read', async (t) => {
  
  try {
    await clearTable(TestPersonModel);
    const createdModelA = await new TestPersonModel(testPersonFixtureA).save();
    let {req, res} = AdapterTestHelpers();
    req.params.id = createdModelA._id;
    await read(req, res);
    
    const readResult = res.data;
    // id is just a getter for _id 
    t.ok(readResult.id === createdModelA.id,  'one should be read');
  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }

});

tape('Mongoose Adapter touch', async (t) => {
  
  try {
    await clearTable(TestPersonModel);
    const createdModelA = await new TestPersonModel(testPersonFixtureA).save();
    let {req, res} = AdapterTestHelpers();
    req.params.id = createdModelA._id;
    await wait(1100); 
    await touch(req, res);
    
    const readResult = res.data;
    // id is just a getter for _id 
    t.ok(readResult.updatedAt > createdModelA.updatedAt,  'should be touched');
  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
    log.info('done');
  }
  // last test must always exit
  process.exit(0);
});


