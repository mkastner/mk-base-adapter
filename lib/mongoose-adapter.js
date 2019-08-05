const mongoose = require('mongoose');
const queryValues = require('./utils/query-values');
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
    const updatedModel = Model.findOneAndUpdate({_id: mongoose.Types.ObjectId(id) }, reqBody, {new: true});
    return updatedModel;
  };
  
  baseAdapter.hooks.list.exec = async function listExec(reqQuery) {
   
    return new Promise ( async ( resolve, reject ) => {
      
      try {

        const findExp = {
        };
        
        queryValues(reqQuery, 'in', (field, list) => {
          findExp[field] = { $in: list };
          //qb.whereIn(field, list); 
        });

        queryValues(reqQuery, 'scope', (field, val) => {
          log.debug('scope field    ', field); 
          log.debug('scope val      ', val); 
          findExp[field] = { $eq: val };
          
          //qb.where(field, '=', `${val}`); 
        });

        queryValues(reqQuery, 'search', (keys, values) => {
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
          //qb.whereRaw(raw, args); 
        });
       
        const sortExp = {};
        queryValues(reqQuery, 'order', (field, direction) => {
          log.debug('order field    ', field); 
          log.debug('order direction', direction);
          sortExp[field] = direction.match(/ASC/i) ? 1 : -1;
          //qb.orderBy(field, direction); 
        });
       
        queryValues(reqQuery, 'range', (field, comp, val) => {
          findExp[field] = {};
          // e.g. {created_at: {$gt: 2019-07-17 23.43} 
          findExp[field][`$${comp}`]=val;
          //qb.where(field, comp, val); 
        });

        const options = {
          sort: sortExp,
          // select for only certain fields
          page: reqQuery.page || 1,
          limit: reqQuery.pageSize || 10
        };

        const mongooseResult = await Model.paginate(findExp, options);
 
        const result = {
          page: mongooseResult.page,
          pageSize: mongooseResult.limit, 
          total: mongooseResult.totalDocs,
          hasPrevPage: mongooseResult.hasPrevPage,
          hasNextPage: mongooseResult.hasNextPage,
          pages: mongooseResult.totalPages,
          nextPage: mongooseResult.nextPage,
          prevPage: mongooseResult.prevPage,
        };

        result[listKey] = mongooseResult.docs;

        return resolve(result);

      } catch (err) {
        log.error(err);
        return reject(err);
      }
    }); 
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
