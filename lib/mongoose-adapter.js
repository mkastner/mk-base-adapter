const mongoose = require('mongoose');
const queryValues = require('./utils/query-values');
const endsWith = require('./utils/ends-with');
const log = require('mk-log');

function handleValidationError(err) {
  if (err.name === 'ValidationError') {
    const errorObj = {
      error: { 
        name: err.name,
        message: 'Fehler bei der Datenspeicherung'
      }
    };
    if (err.errors) {
      errorObj.error.errors = {}; 
      for (let key in err.errors) {
        errorObj.error.errors[key] = {}; 
        errorObj.error.errors[key].message = err.errors[key].message; 
        errorObj.error.errors[key].name = err.errors[key].name; 
      }
    }
    return errorObj;
  }
  log.error(err);
  throw err;
}


const BaseAdapter = require('./base-adapter');

module.exports = function MongooseAdapter (Model, options, hookOptions) {

  const baseAdapter = BaseAdapter (Model, options, hookOptions);
  let listKey = 'docs';
  let optionsFixOn = 'title';
  if (options) {
    if (options.listKey) {
      listKey = options.listKey; 
    }
    if (options.fixOn) {
      optionsFixOn = options.fixOn; 
    }
  }

  baseAdapter.hooks.create.exec = async function createExec (reqBody) {
    try {
      const newModel = new Model (reqBody);
      const createdModel = await newModel.save(); //returns promise
      return createdModel;
    } catch (err) {
      return handleValidationError(err);
    }    
  };
  
  baseAdapter.hooks.copy.exec = async function copyExec (req) {
    const id = req.params.id;

    const exclude = req.body.exclude || []; 
    const include = req.body.include || [];
    const prefix  = req.body.prefix  || ''; 
    const postfix = req.body.postfix || '(Kopie)';
    const fixOn = req.body.fixOn || optionsFixOn || 'title';
   
    try {
      if (exclude.length > 0 && include.length > 0) {
        throw new Error('Using exclude and include at the same time ist not possible');
      }
      const rawDoc = await Model.findById(id);
      const doc = rawDoc.toJSON(); 
      const schemaPaths = Model.schema.paths;

      const copyAttrsSet = new Set();
      for (let key in schemaPaths) {

        if (!key.match(/__v|_id/)) {
          if (exclude.length) {
            if (exclude.includes(key)) {
              copyAttrsSet.delete(key); 
            } else {
              copyAttrsSet.add(key); 
            }
          } 
          else if (include.length) {
            if(include.includes(key)) {
              copyAttrsSet.add(key); 
            } else {
              copyAttrsSet.delete(key); 
            }
          }
          else {
            copyAttrsSet.add(key); 
          } 
        }
      } 
      const copyAttrs = Array.from(copyAttrsSet);
      
      const copyData = {}; 
      for (let i = 0, l = copyAttrs.length; i < l; i++) {
        let val = doc[copyAttrs[i]];
        if ( copyAttrs[i] === fixOn ) {
          val = `${prefix}${val}${postfix}`;
        } 
        copyData[copyAttrs[i]] = val;  
      }
      const copyModel = new Model(copyData);
      const createdCopy = await copyModel.save();
      return createdCopy;
    } catch(err) {
      return handleValidationError(err); 
    }
  };

  baseAdapter.hooks.update.exec = async function updateExec(id, reqBody) {
    try {
      const foundRecord = await Model.findOne({ _id: mongoose.Types.ObjectId(id) });

      for (let key in reqBody) {
        // remove id keys and version key __v 
        if (!key.match(/^id$|^_id$|^__v$/)) {
          foundRecord[key] = reqBody[key];
        }
      } 

      const updatedRecord = await foundRecord.save();
    
      return updatedRecord;
    } catch(err) {
      return handleValidationError(err); 
    }   
  };
  
  baseAdapter.hooks.list.exec = async function listExec(req, withRelated) {

    try {

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
        sortExp[field] = direction.match(/ASC/i) ? 1 : -1;
      });
     
      queryValues(req.query, 'range', (field, comp, val) => {
        findExp[field] = {};
        // e.g. {created_at: {$gt: 2019-07-17 23.43} 
        findExp[field][`$${comp}`]=val;
      });

      const options = {
        lean: req.query.lean === 'true',
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
    } catch(err) {
      return handleValidationError(err);
    }
  };

  baseAdapter.hooks.remove.exec = async function removeExec(id) {
    try { 
      return Model.deleteOne({ _id: mongoose.Types.ObjectId(id) }); 
    } catch (err) {
      return handleValidationError(err);
    }
  };
  
  baseAdapter.hooks.removeMultiple.exec = async function removeMultipleExec(ids) {
    try { 
      const objectIds = ids.map(id => mongoose.Types.ObjectId(id)); 
      const deletedModels = Model.deleteMany({_id: { $in: objectIds }});
      return deletedModels;
    } catch (err) {
      return handleValidationError(err);
    }
  };
  
  baseAdapter.hooks.upsertMultiple.exec = async function upsertMultipleExec(reqBody) {
    
    try {

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
    } catch (err) {
      return handleValidationError(err);
    }
  };
  
  baseAdapter.hooks.read.exec = async function readExec(id) {
    try {
      const objectId = mongoose.Types.ObjectId(id); 
      return Model.findOne({_id: objectId});
    } catch (err) {
      return handleValidationError(err);
    }
  };
  
  baseAdapter.hooks.touch.exec = async function touchExec(id) {
    try {
      const objectId = mongoose.Types.ObjectId(id);
      const timestamp = mongoose.Types.ObjectId().getTimestamp();
      log.debug('timestamp', timestamp);
      return Model.collection.findOneAndUpdate({_id: objectId}, { $set: { updatedAt: timestamp}});
    } catch (err) {
      return handleValidationError(err);
    }
  };
  
  return baseAdapter;  

};
