const env = process.env.NODE_ENV;
if (env !== 'test') {
  throw new Error('tests must be run in test env');
}
const tape = require('tape');
const log = require('mk-log');
const TestPersonModel = require('./models/test-person-model');
const Vue = require('vue');
const Vuex = require('vuex');
const Base = require('../../lib/utils/vuex-base-store');
const clearTable = require('./utils/clear-table');
const Server = require('../utils/server'); 
const port = 3001;
Vue.use(Vuex);

const {
  create,
  remove,
  //removeMultiple,
  update,
  upsertMultiple, 
  read,
  list,
  //touch
} = require('../../lib/bookshelf-adapter.js')(TestPersonModel, {listKey: 'items'});

const initialFirstName = 'NewTestAFirstName';
const initialLastName = 'NewTestALastName';

function createStore(hostPort) {

  const store = new Vuex.Store({
    modules: {
      base: Base(`http://localhost:${hostPort}/api/test`, {listKey: 'items'}, { 
        create(initialObj) {
          initialObj.first_name = initialObj.first_name || initialFirstName;
          initialObj.last_name = initialObj.last_name || initialLastName;
          return initialObj;
        } 
      })
    }
  });

  return store;

}

async function main() {

  await tape('create initial default item', async (t) => {
    try { 
    
      await clearTable(TestPersonModel);

      const {app, server} = await Server(port);

      // server endpoint waiting
      // for requests
      app.post('/api/test', create);

      const store = createStore(port);
     
      const result = await store.dispatch('base/create'); 

      t.equal(result.first_name, initialFirstName );

      server.close();
      t.end();
    } catch (err) {
      log.error(err);
    }
  });
 
  await tape('list items', async (t) => {
    try { 
      await clearTable(TestPersonModel);

      const {app, server} = await Server(port);

      // server endpoint waiting
      // for requests
      app.post('/api/test', create);
      app.get('/api/test', list);

      const store = createStore(port);
     
      await store.dispatch('base/create'); 
      await store.dispatch('base/create'); 

      const result = await store.dispatch('base/fetch'); 

      t.true(result.items.length >= 2);

      server.close();
      t.end();
    } catch (err) {
      log.error(err);
    }
  });
  
  await tape('update item', async (t) => {
    try { 
      await clearTable(TestPersonModel);

      const {app, server} = await Server(port);

      // server endpoint waiting
      // for requests
      app.post('/api/test', create);
      app.patch('/api/test/:id', update);
      app.get('/api/test', list);
      app.get('/api/test/:id', read);

      const store = createStore(port);
     
      await store.dispatch('base/create'); 
      const fetchedList = await store.dispatch('base/fetch'); 
      
      const item = fetchedList.items[0];

      const updatedFirstName = 'UpdatedFirstName';
      const updatedLastName = 'UpdatedLastName';


      await store.dispatch('base/update', {
        id: item.id, 
        fields: {
          first_name: updatedFirstName,
          last_name: updatedLastName
        }}); 

      const result = await store.dispatch('base/read', item.id); 

      t.equals(result.first_name, updatedFirstName);

      server.close();
      t.end();
    } catch (err) {
      log.error(err);
    }
  });
  
  await tape('remove item', async (t) => {
    try { 
      await clearTable(TestPersonModel);

      const {app, server} = await Server(port);

      // server endpoint waiting
      // for requests
      app.get('/api/test', list);
      app.post('/api/test', create);
      app.delete('/api/test/:id', remove);

      const store = createStore(port);
     
      await store.dispatch('base/create'); 
      const fetchedList = await store.dispatch('base/fetch'); 
      
      const item = fetchedList.items[0];
      await store.dispatch('base/delete', item.id); 

      const resultList = await store.dispatch('base/fetch'); 

      t.equals(resultList.items.length, 0);

      server.close();
      t.end();
    } catch (err) {
      log.error(err);
    }
  });
  
  await tape('upsert multiple', async (t) => {
    try { 
      await clearTable(TestPersonModel);

      const {app, server} = await Server(port);

      // server endpoint waiting
      // for requests
      app.get('/api/test', list);
      app.post('/api/test', create);
      app.post('/api/test/batch-upsert', upsertMultiple);

      //const store = createStore(port);
   
      const newItems = [{
        first_name: initialFirstName,
        last_name: initialLastName
      },
      {
        first_name: 'NewTestBFirstName',
        last_name: 'NewTestBLastName'
      }];
      
      const store = createStore(port);
     
      const resultList = await store.dispatch('base/upsertBatch', newItems); 
      
      t.equals(resultList.length, 2, 'items should have been created');
     
      const modifiedItem = resultList[0];
      modifiedItem.first_name = 'ChangedFirstName';
      modifiedItem.last_name = 'ChangedLastName';

      const otherItems = [modifiedItem, {
        first_name: 'NewTestBFirstName',
        last_name: 'NewTestBLastName'
      }];

      await store.dispatch('base/upsertBatch', otherItems); 
      const fetchedList = await store.dispatch('base/fetch'); 
      const fetchedItems = fetchedList.items;
      t.equals(fetchedItems[0].first_name, 'ChangedFirstName', 'item should have been changed'); 
      t.equals(fetchedItems.length, 3, 'one item should have been added');


      //await store.dispatch('base/delete', item.id); 

      //const resultList = await store.dispatch('base/fetch'); 


      server.close();
    } catch (err) {
      log.error(err);
    } finally {
      t.end();
    }
  });
}

main();
