const log = require('mk-log'); 

function exec() {
  log.warn('function exec for not implemented'); 
}

module.exports = function BaseAdapter(Model, options, hookOptions) { 
  
  if (!Model) {
    throw new Error('Model required'); 
  }

  const adapter = {
    listKey: 'docs',
    timestampFields: { 
      updated: 'updated_at',
      created: 'created_at' 
    },

    hooks: {
      create: { before() {}, exec, after() {} },
      update: { before() {}, exec, after() {} },
      remove: { before() {}, exec, after() {} },
      upsertMultiple: { before() {}, exec, after() {} },
      removeMultiple: { before() {}, exec, after() {} },
      read: { before() {}, exec, after() {}, withRelated: [], query() {} },
      touch: { before() {}, exec, after() {}, withRelated: [], query() {} }, 
      list: { before() {}, exec, after() {}, 
        withRelated: [], query() {} },
      //modified: { withRelated: [], query() {} }
    }

  };

  adapter.create = async function create(req, res) {

    try {
      if (adapter.hooks.create.before) {
        adapter.hooks.create.before(req); 
      }

      const savedModel = await adapter.hooks.create.exec(req.body);
      /*
      const newModel = new Model(req.body);
      const rawSavedModel = await newModel.save();
      const savedModel = rawSavedModel.toJSON();
      */
      if (adapter.hooks.create.after) {
        adapter.hooks.create.after(req, savedModel); 
      }
      res.status(200).json(savedModel); 
    } catch (err) {
      log.error(err); 
      res.status(500).json({error: err}); 
    }
  };
  
  adapter.read = async function read(req, res) {

    try {
      if (adapter.hooks.read.before) {
        adapter.hooks.read.before(req); 
      }
      
      const readModel = await adapter.hooks.read.exec(req.params.id);
      
      if (adapter.hooks.read.after) {
        adapter.hooks.read.after(res, readModel); 
      }
      res.status(200).json(readModel); 
    } catch (err) {
      log.error(err); 
      res.status(500).send(JSON.stringify({error: err})); 
    }
  };  

  adapter.touch = async function touch(req, res) {

    try {
      if (adapter.hooks.touch.before) {
        adapter.hooks.touch.before(req); 
      }
    
      const touchedModel = await adapter.hooks.touch.exec(req.params.id);
      // read the updated model 
      const readModel = await adapter.hooks.read.exec(req.params.id);

      if (adapter.hooks.touch.after) {
        adapter.hooks.touch.after(res, touchedModel); 
      }
      res.status(200).json(readModel); 
    } catch (err) {
      log.error(err); 
      res.status(500).send(JSON.stringify({error: err})); 
    }
  };  


  adapter.update = async function update ( req, res ) {

    try {
   
      if (adapter.hooks.update.before) {
        adapter.hooks.update.before(req); 
      }

      const updatedModel = 
        await adapter.hooks.update.exec(req.params.id, req.body);
      /*
      const newModel = new Model(req.body);
      const rawSavedModel = await newModel.save();
      const savedModel = rawSavedModel.toJSON();
      */
      if (adapter.hooks.update.after) {
        adapter.hooks.update.after(req, updatedModel); 
      }
      res.status(200).json(updatedModel); 

    } catch (err) {
      log.error(err); 
      res.status(500).send(JSON.stringify({error: err})); 
    }
  };
 
  adapter.upsertMultiple = async function upsertMultiple(req, res) {
    try { 
      if (adapter.hooks.upsertMultiple.before) {
        adapter.hooks.upsertMultiple.before(req); 
      }
      const resultRecords = 
        await adapter.hooks.upsertMultiple.exec(req.body);
      if (adapter.hooks.upsertMultiple.after) {
        adapter.hooks.upsertMultiple.after(req, resultRecords); 
      }
      res.status(200).json(resultRecords); 
    } catch (err) {
      log.error(err);
      res.status(500).json(JSON.stringify({error: err})); 
    }

  };

  adapter.remove = async function remove(req, res) {
    try {
      if (adapter.hooks.remove.before) {
        adapter.hooks.remove.before(req.body, req); 
      }
      let id = req.params.id;
      const destroyed = 
        await adapter.hooks.remove.exec(id);
      if (adapter.hooks.remove.after) {
        adapter.hooks.remove.after(destroyed, req); 
      }
      res.status(200).json(destroyed); 
    } catch (err) { 
      log.error(err);
      res.status(500).send({error: err}); 
    }
  },
  
  adapter.removeMultiple = async function removeMultiple(req, res) {
    try {
      if (adapter.hooks.removeMultiple.before) {
        adapter.hooks.create.before(req.body, req); 
      }
      let ids = req.body.ids;
      const destroyed = 
        await adapter.hooks.removeMultiple.exec(ids);
      if (adapter.hooks.removeMultiple.after) {
        adapter.hooks.create.before(destroyed, req); 
      }
      res.status(200).json(destroyed); 
    } catch (err) { 
      log.error(err);
      res.status(500).send({error: err}); 
    }
  },

  adapter.list = async function list(req, res) {
    try {
      let withRelated = [];
      
      if (adapter.hooks.list.withRelated) {
        withRelated = adapter.hooks.list.withRelated; 
      }

      if (adapter.hooks.list.before) {
        adapter.hooks.list.before(req); 
      }
      
      const result = 
        await adapter.hooks.list.exec(req.query, 
          withRelated);
      
      res.status(200).json(result);
       
    } catch(err) {
      console.error(err);
    }
  };

  if (hookOptions) {
    for (let key in hookOptions) {
      adapter.hooks[key] = hookOptions[key]; 
    } 
  }


  if (options) {
    if (options.listKey) {
      adapter.listKey = options.listKey; 
    }
    if (options.timestampFields) {
      for (let key in options.timestampFields) {
        adapter.timestampFields[key] = options.timestampFields[key];
      } 
    }
    /* 
    if (options.dateFormat) {
      dateFormat = options.dateFormat; 
    }*/
  }

  return adapter;

};
