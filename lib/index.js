const log = require('./utils/base-log')(__filename);
const Moment = require('moment'); 
//moment.lang('de');
//const pluralize = require('pluralize');


function sortParam(param, func) {
  
  if (!func) {
    throw new Error('function must be passed as argument'); 
  } 
  
  if (param && !param.match(/none/)) {
    let splittedSort = decodeURIComponent(param).split('-');
    for (let i = 0, l = splittedSort.length; i < l; i++) {
      let sort = splittedSort[i];
      let splittedArg = sort.split(':');
      func(splittedArg[0], splittedArg[1]);
    }
  }

}

function scopeParam(param, func) {
  
  if (!func) {
    throw new Error('function must be passed as argument'); 
  } 

  if (param) {
    let splittedScope = decodeURIComponent(param).split('-');
    for (let i = 0, l = splittedScope.length; i < l; i++) {
      let sort = splittedScope[i];
      let splittedArg = sort.split(':');
      let list = null; 
      if (splittedArg[1] && splittedArg[1].indexOf('_') >= 0) {
        list = splittedArg[1].split('_'); 
      }
      func(splittedArg[0], splittedArg[1], list);
    }
  }

}

function searchParam(param, func) {
  
  if (!func) {
    throw new Error('function must be passed as argument'); 
  } 
  if (param && !param.match(/none/)) {
    let splittedSearch = decodeURIComponent(param).split('-');
    for (let i = 0, l = splittedSearch.length; i < l; i++) {
      let search = splittedSearch[i];
      let splittedArg = search.split(':');
      func(splittedArg[0], splittedArg[1]);
    }
  }

}

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

  let hooks = {
    create: {},
    read: {},
    remove: {},
    list: {},
    scoped: {},
    update: {},
    outdated: {},
    reconcile: {}
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
        const model = new Model({id: req.params.id});
        let destroyed = await model.destroy();
        res.status(200).json(destroyed.toJSON()); 
      } catch (err) { 
        log.error(err);
        res.status(500).send(JSON.stringify({error: err})); 
      }
    },
    
    async removeMultiple(req, res) {
      
      try {
        //const model = new Model({id: req.params.id});
        let ids = `${req.params.ids}`.split('-');
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
          if (hooks.read.query) {
            hooks.read.query(qb); 
          }
          qb.where({id: req.params.id});
        });
        let rawResult = await query.fetch();
        res.status(200).json(rawResult.toJSON());
      } catch(err) {
        log.error(err);
        res.status(200).json({error: err});
      }
    },
    
    async readMultiple(req, res) {
      try {
        let ids = `${req.params.ids}`.split('-');
        
        let query = Model.query((qb) => {
          if (hooks.read.query) {
            hooks.readMultiple.query(qb); 
          }
          qb.whereIn('id', ids);
        });
        let rawResult = await query.fetchAll();
        res.status(200).json(rawResult.toJSON());
      } catch(err) {
        log.error(err);
        res.status(200).json({error: err});
      }
    },

    async list(req, res) {
      try {
        
        const page = req.params.page || 1;
        const pageSize = req.params.pageSize || 10;
        const sort = req.params.sort || '';
        const search = req.params.search || ''; 
       
        const query = Model.query((qb) => {

          searchParam(search, (field, word) => {
            qb.where(field, 'LIKE', `${word}%`); 
          });
          
          sortParam(sort, (field, order) => {
            qb.orderBy(field, order); 
          });
          
          if (hooks.list.query) {
            hooks.list.query(qb); 
          }
        });
          
        let rawResult = await query.fetchPage({
          page, pageSize
        });

        let JSONResult = {
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
    
    async scoped(req, res) {
      try {
        
        const scope = req.params.scope || ''; 

        const query = Model.query((qb) => {

          //console.log('scope', scope);

          scopeParam(scope, (field, value, list) => {
            //console.log('value', value);
            //console.log('list', list);
            
            if (list) {
              qb.whereIn(field, list); 
            } else {
              qb.where(field, value); 
            }
          });
          
          if (hooks.scoped.query) {
            hooks.scoped.query(qb); 
          }
        });
          
        let rawResult = await query.fetchAll();
        res.status(200).json(rawResult.toJSON());
         
      } catch(err) {
        console.error(err);
      }
    },
    
    async modified(req, res) {
      try {
        
        if (!req.params.date) {
          throw new Error('param "date" missing'); 
        }

        let withRelated = [];
        
        if (hooks.outdated.withRelated) {
          withRelated = hooks.outdated.withRelated; 
        }
    
        // latest-update: lateste updated_on date
        // on client
        //
        let latestClientUpdate = decodeURIComponent(req.params.date);
        
        let parsedDate = new Moment(latestClientUpdate);
        
        //log.info('parsedDate', parsedDate);
        let latestClientDate = parsedDate.format(dateFormat);
        let rawModels = await Model.query((qb) => {
          qb.where(timestampFields.updated, '>', latestClientDate);
        }).fetchAll({
          withRelated
        }); 
        
        let models = rawModels.toJSON();
        return res.status(200).json(models); 
      } catch (err) {
        log.error(err); 
        return res.status(400).send(JSON.stringify({error: err})); 
      }
    },

    async reconcile(req, res) {
      try {
       
        log.info('req.body', req.body);        

        const {
          lastClientModified, 
          updatedClientRecords,
          newClientRecords,
          deletedClientRecords
        } = req.body;

        let withRelated = [];
        
        if (hooks.reconcile.withRelated) {
          withRelated = hooks.reconcile.withRelated; 
        }
       
        if (!lastClientModified) {
          let rawModels = await Model.query((qb) => {
            //qb.whereNotIn('tables.id', ids);
          }).fetchAll({
            withRelated
          }); 
          let models = rawModels.toJSON();
          return res.status(200).json({ initialServerRecords: models}); 
           
        }
        //log.info('parsedDate', parsedDate);
         
        let rawModels = await Model.query((qb) => {
          //qb.whereNotIn('tables.id', ids);
        }).fetchAll({
          withRelated
        }); 
        
        let models = rawModels.toJSON();
        return res.status(200).json(models); 
      } catch (err) {
        log.error(err); 
        return res.status(400).send(JSON.stringify({error: err})); 
      }
    }
  };

  let props = {};

  return Object.create(proto, props);

};
