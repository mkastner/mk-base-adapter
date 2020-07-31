const mongoose = require('mongoose');
const queryValues = require('./utils/query-values');
const endsWith = require('./utils/ends-with');
const log = require('mk-log');

const BaseAdapter = require('./base-adapter');

module.exports = function MongooseAdapter (Model, options, hookOptions) {

  const baseAdapter = BaseAdapter (Model, options, hookOptions);
  let listKey = 'docs';

  if (options) {
    if (options.listKey) {
      listKey = options.listKey; 
    }
  }

  baseAdapter.hooks.create.exec = async function createExec (reqBody) {
    return new Promise ( async ( resolve, reject ) => {
      try {
        const newModel = new Model (reqBody);
        const createdModel = await newModel.save(); //returns promise
        resolve (createdModel);
      } catch (err) {
        if (err.name === 'ValidationError') {
          const errorObj = {
            error: { 
              name: 'ValidationError',
              message: err.message
            }
          };
          if (err.errors) {
            errorObj.errors = {}; 
            for (let key in err.errors) {
              errorObj.errors[key] = {}; 
              errorObj.errors[key].message = err.errors[key].message; 
              errorObj.errors[key].name = err.errors[key].name; 
            }
          }
          resolve(errorObj);
        } else {
          reject(err);
        }
      }
    });
  };
  
  baseAdapter.hooks.update.exec = async function updateExec(id, reqBody) {

    log.debug('mk-base-adapter reqBody     ', reqBody);

    const foundRecord = await Model.findOne({ _id: mongoose.Types.ObjectId(id) });

    log.debug('mk-base-adapter foundRecord', foundRecord);
    for (let key in reqBody) {
      if (!key.match(/^id$|^_id$/)) {
        foundRecord[key] = reqBody[key];
      }
    } 

    const updatedRecord = await foundRecord.save();

    log.debug('mk-base-adapter updatedRecord', updatedRecord);
  
    return updatedRecord;
      
  };
  
  baseAdapter.hooks.list.exec = async function listExec(req, withRelated) {
   
    log.debug('req.query', req.query);

    const findExp = {
    };
    
    queryValues(req.query, 'in', (field, list) => {
      findExp[field] = { $in: list };
    });

    queryValues(req.query, 'scope', (field, val) => {
      log.debug('scope field    ', field); 
      log.debug('scope val      ', val);


      // check if this is an id field
      // endsWith returns string minus ending if ending matches
      // else returns falsy 
      const remainder = endsWith(field, 'Id'); 

      let remainderObj = null;

      if (remainder) {
        remainderObj = new mongoose.Types.ObjectId(val);          
      }

      log.debug('remainder   ', remainder); 
      log.debug('remainderObj', remainderObj); 

      //const eq = remainder || val;

      findExp[remainder || field] = { $eq: remainderObj || val };

      log.debug('findEx', findExp);

    });

    queryValues(req.query, 'search', (keys, values) => {
      if (!keys.length || !values.length) {
        return false;
      }
      findExp['$or'] = [];
      for (let i = 0, l = keys.length; i < l; i++) {
        const val = values[i];
        if (val) {
          let key = keys[i];
          const searchItem = {};
          searchItem[key] = new RegExp(values.join('|'),'ig'); 
          findExp['$or'].push(searchItem);
        }
      }
    });
   
    const sortExp = {};
    queryValues(req.query, 'order', (field, direction) => {
      log.debug('order field    ', field); 
      log.debug('order direction', direction);
      sortExp[field] = direction.match(/ASC/i) ? 1 : -1;
    });
   
    queryValues(req.query, 'range', (field, comp, val) => {
      findExp[field] = {};
      // e.g. {created_at: {$gt: 2019-07-17 23.43} 
      findExp[field][`$${comp}`]=val;
    });

    const options = {
      lean: true,
      sort: sortExp,
      // select for only certain fields
      page: req.query.page || 1,
      limit: req.query.pageSize || 10
    };

    log.debug('withRelated', withRelated);

    if (withRelated && withRelated.length) {
      options['populate'] = withRelated; 
    }

    const mongooseResult = await Model.paginate(findExp, options);

    const result = {
      pagination: {
        page: mongooseResult.page,
        pageSize: mongooseResult.limit, 
        total: mongooseResult.totalDocs,
        hasPrevPage: mongooseResult.hasPrevPage,
        hasNextPage: mongooseResult.hasNextPage,
        pages: mongooseResult.totalPages,
        nextPage: mongooseResult.nextPage,
        prevPage: mongooseResult.prevPage,
      }
    };

    result[listKey] = mongooseResult.docs;

    return result;
  };

  baseAdapter.hooks.remove.exec = async function removeExec(id) {
    return Model.deleteOne({ _id: mongoose.Types.ObjectId(id) }); 
  };
  
  baseAdapter.hooks.removeMultiple.exec = async function removeMultipleExec(ids) {
    const objectIds = ids.map(id => mongoose.Types.ObjectId(id)); 
    const deletedModels = Model.deleteMany({_id: { $in: objectIds }});
    return deletedModels;
  };
  
  baseAdapter.hooks.upsertMultiple.exec = async function upsertMultipleExec(reqBody) {

    const bulk = Model.collection.initializeUnorderedBulkOp();

    const updatedIds = [];

    for (let i = 0, l = reqBody.length; i < l; i++) {
      //bulk.insert(reqBody[i]);
      const item = reqBody[i];
      if (item._id) {
        const objId = mongoose.Types.ObjectId(item._id); 
        const timestamp = mongoose.Types.ObjectId().getTimestamp();
        item.updatedAt = timestamp;
        bulk.find({_id: objId}).updateOne({$set: item}); 
        updatedIds.push(item._id); 
      } else {
        item.createdAt = mongoose.Types.ObjectId().getTimestamp();
        item.updatedAt = item.createdAt;
        bulk.insert(item);
      }
    }
   
    const bulkResult = await bulk.execute();
    const insertedIds = bulkResult.result.insertedIds.map( idItem => idItem._id);
    const objectIds = insertedIds.concat(updatedIds).map( 
      id => mongoose.Types.ObjectId(id));
    const affectedModels = await Model.find({ _id: { $in: objectIds }}); 
     
    return affectedModels;
  };
  
  baseAdapter.hooks.read.exec = async function readExec(id) {
    const objectId = mongoose.Types.ObjectId(id); 
    return Model.findOne({_id: objectId});
  };
  
  baseAdapter.hooks.touch.exec = async function touchExec(id) {
    const objectId = mongoose.Types.ObjectId(id);
    const timestamp = mongoose.Types.ObjectId().getTimestamp();
    log.debug('timestamp', timestamp);
    return Model.collection.findOneAndUpdate({_id: objectId}, { $set: { updatedAt: timestamp}});
  };
  
  return baseAdapter;  

};
