const env = process.env.NODE_ENV;
if (env !== 'test') {
  throw new Error('Tests must be run in test env');
}

const log = require('mk-log');
const TestPersonModel = require('./models/test-person-model');
const TestCarModel = require('./models/test-car-model');
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
  copy,
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

const testCarFixtureA = {
  title: 'VW'
};

const testCarFixtureB = {
  title: 'Audi'
};

const testCarFixtureC = {
  title: 'Mercedes'
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
 
    log.info('after update clearTable');
    const helperA = AdapterTestHelpers();
    const reqA = helperA.req;
    const resA = helperA.res;

    const createdModelData = 
      await new TestPersonModel(testPersonFixtureA).save();
    
    log.debug('after update createdModelData');
    
    reqA.params.id = createdModelData.id;
    reqA.body = {lastName: 'TestZ'};
    
    log.debug('before update');

    await update(reqA, resA);
   
    log.debug('after update');

    t.equals(reqA.body.last_name,  resA.data.last_name, 'should be updated');
  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }
});

tape('Mongoose Adapter copy', async (t) => {
  
  try {
 
    await clearTable(TestPersonModel);
  
    const createdModel = await new TestPersonModel(testPersonFixtureA).save();
    const id = createdModel._id;
    
    let {req, res} = AdapterTestHelpers();

    req.params.id = id;
    req.body = {
      fixOn: 'lastName',
      include: ['lastName', 'firstName' ],
    }; 

    await copy(req, res);

    log.info(res.data);

    t.notEqual(id, res.data._id, 'should have created a copy with differnt id');
    t.equal(createdModel.firstName, res.data.firstName, 'should have created a copy');


  } catch (err) {
    log.error(err);
  } finally {
    t.end(); 
  }
});

tape('Mongoose Adapter list search', async (t) => {
  
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

tape('Mongoose Adapter list in', async (t) => {
  
  try {
 
    await clearTable(TestPersonModel);
    await clearTable(TestCarModel);
  
    const {req, res} = AdapterTestHelpers();
    const createdCarModelA = await new TestCarModel(testCarFixtureA).save();
    const createdCarModelB = await new TestCarModel(testCarFixtureB).save();
    const createdCarModelC = await new TestCarModel(testCarFixtureC).save();
   
    testPersonFixtureA.cars = [createdCarModelA];
    testPersonFixtureA.cars.push(createdCarModelB);
    
    testPersonFixtureB.cars = [createdCarModelB];
    testPersonFixtureB.cars.push(createdCarModelA);
    testPersonFixtureB.cars.push(createdCarModelC);

    await new TestPersonModel(testPersonFixtureA).save();
    await new TestPersonModel(testPersonFixtureB).save();

    req.query = `in[cars]=${createdCarModelA._id}&in[cars]=${createdCarModelB._id}`; 

    await list(req, res);

    log.debug(res.data.items);

    t.ok(res.data.items.length === 2, 'should have 2 docs');

    req.query = `in[cars]=${createdCarModelA._id}`; 

    await list(req, res);
    
    t.equal(res.data.items.length, 2, 'should have exactly 2 doc');

    req.query = `in[cars]=${createdCarModelC._id}`; 

    await list(req, res);
    
    t.equal(res.data.items.length, 1, 'should have exactly 1 doc');

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


