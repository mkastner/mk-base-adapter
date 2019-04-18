const log = require('mk-log');
const queryValues = require('./utils/query-values');
//const Moment = require('moment'); 

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
    create: { before() {}},
    update: { },
    remove: { },
    removeMultiple: { },
    read: { withRelated: [], query() {} },
    delete: { withRelated: [], query() {} }, 
    //reconcile: { withRelated: [], query() {} },
    list: { withRelated: [], query() { log.info('list query undefined ***');} },
    //modified: { withRelated: [], query() {} }
  };
  
  let listKey = 'docs';
  let timestampFields = { updated: 'updated_at', created: 'created_at' };
  // let dateFormat = 'YYYY-MM-DD HH:mm:ss'; 
  
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
    /* 
    if (options.dateFormat) {
      dateFormat = options.dateFormat; 
    }*/
  }

  if (!Model) {
    throw new Error('Model required'); 
  }

  let proto = {
    
    async create(req, res) {
  
      try {
        if (hooks.create.before) {
          hooks.create.before(req.body, req); 
        }
        const newModel = new Model(req.body);
        let savedModel = await newModel.save();
        res.status(200).json(savedModel.toJSON()); 
      } catch (err) {
        log.error(err); 
        res.status(500).send(JSON.stringify({error: err})); 
      }
    }, 

    async remove(req, res) {
      try {
        let id = req.params.id;
        let destroyed = await Model.query((qb) => {
          qb.where('id', id); 
        }).destroy(); 
        res.status(200).json(destroyed.toJSON()); 
      } catch (err) { 
        log.error(err);
        res.status(500).send(JSON.stringify({error: err})); 
      }
    },
    
    async removeMultiple(req, res) {
      try {
        let ids = req.body;
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
        const model = new Model({id: req.params.id});
        const  data = req.body;
        
        deleteAutoProps(data);

        log.info('id', req.params.id);
        log.info('data', req.body);


        let savedModel = await model.save(data, {patch: true}); 
        res.status(200).json(savedModel.toJSON()); 
      } catch (err) {
        log.error(err);
        res.status(500).json(JSON.stringify({error: err})); 
      }
    },

    async upsertMultiple(req, res) {
      try {
      

        const rawLatestRecord = await Model.query(qb => {
          qb.orderBy('id', 'DESC');
          qb.limit(1);
        }).fetch();

        const data = req.body;

        log.info('data', data);
        
        const updateIds = [];

        for (let i = 0, l = data.length; i < l; i++) {
          const item = data[i];
          if (item.id) {
            updateIds.push(item.id); 
          }
        }

        const batchUpdateResult = await Model.batchUpdate(data);

        log.info('batchUpdateResult', batchUpdateResult);

        let rawCreatedRecords;
        if (rawLatestRecord) {
          const latestRecord = rawLatestRecord.toJSON();
          log.info('rawLatestRecord', rawLatestRecord);
          rawCreatedRecords = await Model.query(qb => {
            qb.where('id', '>', latestRecord.id);
          }).fetchAll();
        } else {
          rawCreatedRecords = await Model.query(qb => {
            qb.where('id', '>', 0);
          }).fetchAll();
        } 

        let updatedRecords = []; 
       
        if (updateIds && updateIds.length) {
          const rawUpdatedRecords = await Model.query(qb => {
         
            log.info('updateIds', updateIds);

            qb.whereIn('id', updateIds);
          }).fetchAll();
          updatedRecords = rawUpdatedRecords.toJSON(); 
        }
        
        const createdRecords = rawCreatedRecords.toJSON();
        const resultRecords = updatedRecords.concat(createdRecords); 

        res.status(200).json(resultRecords); 
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

          queryValues(req.query, 'search', (raw, args) => {
            log.info('raw', raw);
            log.info('args', args);
            qb.whereRaw(raw, args); 
          });
          
          queryValues(req.query, 'order', (field, direction) => {
            log.info('order field    ', field); 
            log.info('order direction', direction); 
            qb.orderBy(field, direction); 
          });
          
          queryValues(req.query, 'range', (field, comp, val) => {
            qb.where(field, comp, val); 
          });
          
        });
        
        const rawResult = await query.fetchPage({
          page, pageSize, withRelated
        });

        const JSONResult = {
          pagination: {
            page: rawResult.pagination.page,
            pageSize: rawResult.pagination.pageSize,
            total: rawResult.pagination.rowCount,
            pages: rawResult.pagination.pageCount
          }
        };

        log.info('base-dapter pagination', JSONResult.pagination);

        JSONResult[listKey] = rawResult.toJSON();

        if (hooks.list.afterResult) {
          hooks.list.result(JSONResult); 
        }
        
        res.status(200).json(JSONResult);
         
      } catch(err) {
        console.error(err);
      }
    },
   
  };

  let props = {};

  return Object.create(proto, props);

};
