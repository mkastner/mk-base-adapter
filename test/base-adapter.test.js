const log = require('../lib/utils/base-log')(this);
const TestItemModel = require('./db/models/test-item-model');
const Moment = require('moment');
const dateFormat = 'YYYY-MM-DD HH:mm:ss'; 
const tape = require('tape');
const {
  create,
  createMultiple, 
  remove,
  removeMultiple, 
  update,
  read,
  readMultiple,
  list,
  scoped,
  modified 
} = require('../lib/index.js')(TestItemModel, {listKey: 'items'});

const AdapterTestHelpers = require('mk-adapter-test-helpers');

const obj = require('mk-adapter-test-helpers')();

log.info('obj', JSON.stringify(obj));


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
      const {req, res} = AdapterTestHelpers();
      req.body = testItemFixtureA; 
      await create(req, res);
      const createdModel = res.data;

      t.equals(req.body.email, createdModel.email, 'equal created email');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base createMultiple', async function(t) {
    
    try {
      await clearTable();
      const {req, res} = AdapterTestHelpers();
      req.body = [testItemFixtureA, testItemFixtureB];
      await createMultiple(req, res);
      const createdModels = res.data;

      t.equals(createdModels.length, 2, 'creatd multiple records');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base remove', async function(t) {
    try {
      await clearTable();
      const {req, res} = AdapterTestHelpers();
      const createdModel = await new TestItemModel(testItemFixtureA).save();
      const id = createdModel.id;
      req.params.id = id;
      await remove(req, res);
      let removedUser = await TestItemModel.where({id}).fetch();

      t.equals(null, removedUser, 'should be removed');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base removeMultiple', async function(t) {
    try {
      await clearTable();
      const {req, res} = AdapterTestHelpers();
      const createdModelA = await new TestItemModel(testItemFixtureA).save();
      const idA = createdModelA.id;
      const createdModelB = await new TestItemModel(testItemFixtureA).save();
      const idB = createdModelB.id;
      req.params.ids = `${idA}-${idB}`; 
      await removeMultiple(req, res);
      let remainingUsers = await TestItemModel.where('id', '>=', 0).fetchAll();

      t.equals(remainingUsers.toJSON().length, 0, 'should be removed');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base read', async function(t) {
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
  
  await tape('Adapter Base read multiple', async function(t) {
    try {
      const {req, res} = AdapterTestHelpers();
      const createdModelA = await new TestItemModel(testItemFixtureA).save();
      const idA = createdModelA.id;
      const createdModelB = await new TestItemModel(testItemFixtureB).save();
      const idB = createdModelB.id;
      req.params.ids = [idA,idB].join('-');
      await readMultiple(req, res);
      t.equals(2, res.data.length, 'multiple should be read');
      req.params.ids = idA;
      await readMultiple(req, res);
      t.equals(1, res.data.length, 'multiple should be read');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  

  await tape('Adapter Base list', async function(t) {
    
    try {

      await clearTable();
    
      let {req, res} = AdapterTestHelpers();
      
      await new TestItemModel(testItemFixtureA).save();
      const createdModelB = await new TestItemModel(testItemFixtureB).save();
      
      req.params.search = encodeURIComponent(`first_name:${createdModelB.toJSON().first_name}-last_name:${createdModelB.toJSON().last_name}`);
      
      await list(req, res);

      t.equals(1, res.data.items.length, '1 item should be found');
      t.equals(testItemFixtureB.first_name, res.data.items[0].first_name, 'should be found');
      
      let helpers = AdapterTestHelpers();

      req = helpers.req;
      res = helpers.res;

      req.params.sort = encodeURIComponent('first_name:DESC-last_name:DESC');
     
      await list(req, res);
      
      t.equals(testItemFixtureB.first_name, res.data.items[0].first_name, 'should be sorted descending');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base scoped', async function(t) {
    
    try {
    
      await clearTable();
      let {req, res} = AdapterTestHelpers();
      
      const createdModelA = await new TestItemModel(testItemFixtureA).save();
      const createdModelB = await new TestItemModel(testItemFixtureB).save();
      
      req.params.scope = `parent_id:${createdModelB.toJSON().parent_id}`;
      
      await scoped(req, res);

      t.equals(1, res.data.length, '1 item should be found');
      
      req.params.scope = `parent_id:${createdModelA.toJSON().parent_id}_${createdModelB.toJSON().parent_id}`;

      await scoped(req, res);
      t.equals(2, res.data.length, '2 item should be found');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });
  
  await tape('Adapter Base update', async function(t) {
    
    try {
   
      await clearTable();
    
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
  
  await tape('Adapter Base hooks', async function(t) {
    
    try {
      const {
        list,
      } = require('../lib/index.js')(TestItemModel, null, { list: { 
        query(qb) {
          qb.where({parent_id: 1});
        }
      }});
      await clearTable();
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

      t.equal(res.data.docs.length, 1);

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });

  await tape('Adapter Base modified', async function(t) {
    
    try {
      await clearTable();
    
      let {req, res} = AdapterTestHelpers();
      
      const createdModelA = await new TestItemModel(testItemFixtureA).save();
      await wait(2000); 
      //const createdModelB = 
      await new TestItemModel(testItemFixtureB).save();
      const createdModelAData = createdModelA.toJSON(); 
      //const createdModelBData = createdModelB.toJSON(); 

      const momentDate = new Moment(createdModelAData.updated_at); 

      const updatedAt = momentDate.format(dateFormat);
      const encodedDate = encodeURIComponent(updatedAt);
     
      req.params.date = encodedDate;
      
      await modified(req, res);

      t.true(createdModelAData.updated_at < res.data[0].updated_at, 'should be updated');

    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });

}

main();
