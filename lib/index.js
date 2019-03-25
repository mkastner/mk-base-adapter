const log = require('./utils/base-log')(__filename);
const queryValues = require('./utils/query-values');
const Moment = require('moment'); 

//moment.lang('de');
//const pluralize = require('pluralize');

function deleteObjProp(obj, propName) {
  if (obj[propName]) {
    delete obj[propName]; 
  }
} 

function deleteAutoProps(data) {
  deleteObjProp(data, 'id');
  deleteObjProp(data, 'created_at');
  deleteObjProp(data, 'created_on');
  deleteObjProp(data, 'updated_at');
  deleteObjProp(data, 'updated_on');
}

module.exports = function BaseAdapter(Model, options, hookOptions) {

  const hooks = {
    create: {},
    update: { },
    remove: { },
    read: { withRelated: [], query() {} },
    //reconcile: { withRelated: [], query() {} },
    list: { withRelated: [], query() {} },
    //modified: { withRelated: [], query() {} }
  };
  
  let listKey = 'docs';
  let timestampFields = { updated: 'updated_at', created: 'created_at' };
  let dateFormat = 'YYYY-MM-DD HH:mm:ss'; 
  
  if (hookOptions) {
    for (let key in hookOptions) {
      hooks[key] = hookOptions[key]; 
    } 
  }


  if (options) {
    if (options.listKey) {
      listKey = options.listKey; 
    }
    if (options.timestampFields) {
      for (let key in options.timestampFields) {
        timestampFields[key] = options.timestampFields[key];
      } 
    }
    if (options.dateFormat) {
      dateFormat = options.dateFormat; 
    }
  }

  if (!Model) {
    throw new Error('Model required'); 
  }

  let proto = {
    
    async create(req, res) {
  
      try {
        const newModel = new Model(req.body);
        let savedModel = await newModel.save();
        res.status(200).json(savedModel.toJSON()); 
      } catch (err) {
        log.error(err); 
        res.status(500).send(JSON.stringify({error: err})); 
      }
    }, 
    
    async createMultiple(req, res) {
  
      try {
        let savedModels = [];
        for (let i = 0, l = req.body.length; i < l; i++) {
          const newModel = new Model(req.body[i]);
          let savedModel = await newModel.save();
          savedModels.push(savedModel.toJSON());
        }
        res.status(200).json(savedModels); 
      } catch (err) {
        log.error(err); 
        res.status(500).send(JSON.stringify({error: err})); 
      }
    }, 
    
    async remove(req, res) {
      try {
        let ids = `${req.params.id}`.split('+');
        let destroyed = await Model.query((qb) => {
          qb.whereIn('id', ids); 
        }).destroy(); 
        res.status(200).json(destroyed.toJSON()); 
      } catch (err) { 
        log.error(err);
        res.status(500).send(JSON.stringify({error: err})); 
      }
    },

    async update(req, res) {
      try { 
        let model = new Model({id: req.params.id});
        let data = req.body;
        
        deleteAutoProps(data);

        let savedModel = await model.save(data, {patch: true}); 
        res.status(200).json(savedModel.toJSON()); 
      } catch (err) {
        log.error(err);
        res.status(500).json(JSON.stringify({error: err})); 
      }
    },
    
    async read(req, res) {
      try {
        let query = Model.query((qb) => {
          hooks.read.query(qb); 
          qb.where({id: req.params.id});
        });
        let rawResult = await query.fetch();
        res.status(200).json(rawResult.toJSON());
      } catch(err) {
        log.error(err);
        res.status(200).json({error: err});
      }
    },

    async list(req, res) {
      try {
        let withRelated = [];
        
        if (hooks.list.withRelated) {
          withRelated = hooks.list.withRelated; 
        }
        
        const page = req.query.page || 1;
        const pageSize = req.query.pageSize || 10;
       
        const query = Model.query((qb) => {
          
          if (hooks.list.query) {
            hooks.list.query(qb, req); 
          }

          queryValues(req.query, 'in', (field, list) => {
            qb.whereIn(field, list); 
          });

          queryValues(req.query, 'scope', (field, word) => {
            qb.where(field, '=', `${word}`); 
          });

          queryValues(req.query, 'search', (field, word) => {
            qb.where(field, 'LIKE', `${word}%`); 
          });
          
          queryValues(req.query, 'sort', (field, order) => {
            qb.orderBy(field, order); 
          });
          
          queryValues(req.query, 'date', (field, comp, date) => {
            qb.where(field, comp, date); 
          });
          
        });
        
        const rawResult = await query.fetchPage({
          page, pageSize, withRelated
        });

        const JSONResult = {
          pagination: rawResult.pagination
        };

        JSONResult[listKey] = rawResult.toJSON();

        if (hooks.list.afterResult) {
          hooks.list.result(JSONResult); 
        }
        
        res.status(200).json(JSONResult);
         
      } catch(err) {
        console.error(err);
      }
    },
   
    /*
    async modified(req, res) {
      try {
        
        if (!req.query.date) {
          throw new Error('param "date" missing'); 
        }
    
        // latest-update: lateste updated_on date
        // on client
        //
        let latestClientUpdate = decodeURIComponent(req.query.date);
        
        let parsedDate = new Moment(latestClientUpdate);
        
        //log.info('parsedDate', parsedDate);
        let latestClientDate = parsedDate.format(dateFormat);
        let rawModels = await Model.query((qb) => {
          qb.where(timestampFields.updated, '>', latestClientDate);
        }).fetchAll({
          withRelated: hooks.modified.withRelated
        }); 
        
        let models = rawModels.toJSON();
        return res.status(200).json(models); 
      } catch (err) {
        log.error(err); 
        return res.status(400).send(JSON.stringify({error: err})); 
      }
    }
    */
  };

  let props = {};

  return Object.create(proto, props);

};
