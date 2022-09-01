const mongoose = require('mongoose');
const queryValues = require('./utils/query-values.js');
const endsWith = require('./utils/ends-with');
const log = require('mk-log');
const createHooks = require('./utils/create-hooks.js');
const createModelOptions = require('./utils/create-model-options.js');
const handleErrorResponse = require('./utils/mongoose/handle-error-response.js');
const touch = require('./utils/mongoose/touch.js');

function ensureType(val, type) {
  if (type === 'date') {
    return new Date(val);
  }
  return val;
}

module.exports = function MongooseAdapter(Model, options, newHooks) {
  // if no newHooks exist use idle functions from default
  const hooks = newHooks ? newHooks : createHooks();

  log.debug('hooks', hooks);

  const { listKey, timestampFields } = createModelOptions(options);

  let optionsFixOn = 'title';

  let proto = {
    async create(req, res) {
      try {
        hooks.create.before(req);
        const newModel = new Model(req.body);
        const createdModel = await newModel.save(); //returns promise
        hooks.create.after(createdModel, req);
        res.status(200).json(createdModel);
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },

    async remove(req, res) {
      try {
        hooks.remove.before(req);
        const id = req.params.id;
        const result = await Model.deleteOne({
          _id: mongoose.Types.ObjectId(id),
        });
        log.debug('result', result);
        hooks.remove.after(result, req);
        res.status(200).json(result);
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },

    async removeMultiple(req, res) {
      try {
        hooks.removeMultiple.before(req);
        const ids = req.body.ids;
        const objectIds = ids.map((id) => mongoose.Types.ObjectId(id));
        const deletedModels = await Model.deleteMany({
          _id: { $in: objectIds },
        });
        hooks.removeMultiple.after(deletedModels, req);
        res.status(200).json(deletedModels);
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },

    async copy(req, res) {
      try {
        hooks.copy.before(req);
        const id = req.params.id;
        const exclude = req.body.exclude || [];
        const include = req.body.include || [];
        const prefix = req.body.prefix || '';
        const postfix = req.body.postfix || '(Kopie)';
        const fixOn = req.body.fixOn || optionsFixOn || 'title';
        if (exclude.length > 0 && include.length > 0) {
          throw new Error(
            'Using exclude and include at the same time ist not possible'
          );
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
            } else if (include.length) {
              if (include.includes(key)) {
                copyAttrsSet.add(key);
              } else {
                copyAttrsSet.delete(key);
              }
            } else {
              copyAttrsSet.add(key);
            }
          }
        }
        const copyAttrs = Array.from(copyAttrsSet);

        const copyData = {};
        for (let i = 0, l = copyAttrs.length; i < l; i++) {
          let val = doc[copyAttrs[i]];
          if (copyAttrs[i] === fixOn) {
            val = `${prefix}${val}${postfix}`;
          }
          copyData[copyAttrs[i]] = val;
        }

        log.info('copyData', copyData);

        const copyModel = new Model(copyData);
        const createdCopy = await copyModel.save();
        hooks.copy.after(createdCopy, req);
        res.status(200).json(createdCopy);
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },
    async update(req, res) {
      hooks.update.before(req);
      const id = req.params.id;
      const data = req.body;

      try {
        const foundRecord = await Model.findOne({
          _id: mongoose.Types.ObjectId(id),
        });

        for (let key in data) {
          // remove id keys and version key __v
          if (!key.match(/^id$|^_id$|^__v$/)) {
            foundRecord[key] = data[key];
          }
        }

        const updatedRecord = await foundRecord.save();
        hooks.update.after(updatedRecord, req);
        return updatedRecord;
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },
    async list(req, res) {
      try {
        hooks.list.before(req);

        const withRelated = [];
        hooks.list.withRelated(withRelated);

        const findExp = {};

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

        log.debug('req.query', req.query);

        queryValues(req.query, 'search', (keys, values) => {
          if (!keys.length || !values.length) {
            return false;
          }
          if (!findExp['$or']) {
            findExp['$or'] = [];
          }
          for (let i = 0, l = keys.length; i < l; i++) {
            const val = values[i];
            if (val) {
              let key = keys[i];
              const searchItem = {};
              searchItem[key] = new RegExp(values.join('|'), 'ig');
              findExp['$or'].push(searchItem);
            }
          }
        });

        const sortExp = {};
        queryValues(req.query, 'order', (field, direction) => {
          sortExp[field] = direction.match(/ASC/i) ? 1 : -1;
        });

        queryValues(req.query, 'range', (field, comp, val, type) => {
          log.info('field', field);
          log.info('comp ', comp);
          log.info('val  ', val);
          if (!findExp['$and']) {
            findExp['$and'] = [];
          }
          const rangeObj = {};
          rangeObj[field] = {};

          // in mongoose only use typed Val
          rangeObj[field][`$${comp}`] = ensureType(val, type);
          //  findExp[field][`$${comp}`]=val;
          log.debug('range rangeObj', rangeObj);
          findExp['$and'].push(rangeObj);

          log.debug('qeryValues findExp', findExp);
          log.debug('qeryValues findExp $and', findExp['$and']);
          //console.log('qeryValues findExp', findExp);
        });

        const options = {
          lean: req.query.lean === 'true',
          sort: sortExp,
          // select for only certain fields
          page: req.query.page || 1,
          limit: req.query.pageSize || 10,
        };

        log.debug('withRelated', withRelated);

        if (withRelated && withRelated.length) {
          options['populate'] = withRelated;
        }

        log.debug('range findExp', findExp);

        log.debug('Model.find', await Model.find());

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
          },
        };

        result[listKey] = mongooseResult.docs;

        hooks.list.after(result, req);
        res.status(200).json(result);
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },

    async upsertMultiple(req, res) {
      try {
        hooks.upsertMultiple.before(req);

        const bulk = Model.collection.initializeUnorderedBulkOp();

        const updatedIds = [];

        for (let i = 0, l = req.body.length; i < l; i++) {
          //bulk.insert(reqBody[i]);
          const item = req.body[i];
          if (item._id) {
            const objId = mongoose.Types.ObjectId(item._id);
            const timestamp = mongoose.Types.ObjectId().getTimestamp();
            item.updatedAt = timestamp;
            bulk.find({ _id: objId }).updateOne({ $set: item });
            updatedIds.push(item._id);
          } else {
            item.createdAt = mongoose.Types.ObjectId().getTimestamp();
            item.updatedAt = item.createdAt;
            bulk.insert(item);
          }
        }

        const bulkResult = await bulk.execute();
        const insertedIds = bulkResult.result.insertedIds.map(
          (idItem) => idItem._id
        );
        const objectIds = insertedIds
          .concat(updatedIds)
          .map((id) => mongoose.Types.ObjectId(id));
        const affectedModels = await Model.find({ _id: { $in: objectIds } });

        hooks.upsertMultiple.after(affectedModels, req);
        res.data = affectedModels;
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },

    async read(req, res) {
      try {
        hooks.read.before(req);
        const id = req.params.id;
        const objectId = mongoose.Types.ObjectId(id);
        log.debug('objectId', objectId);
        const result = await Model.findOne({ _id: objectId });
        hooks.read.after(result, req);
        res.data = result;
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },

    async touch(req, res) {
      try {
        hooks.touch.before(req);
        const id = req.body.id;
        const result = await touch(id, Model);
        const data = result.value;
        log.debug('data', data);
        const responseData = Object.fromEntries(
          ['_id', 'updatedAt']
            .filter((key) => key in data)
            .map((key) => [key, data[key]])
        );
        hooks.touch.before(responseData, req);
        res.status(200).json(responseData);
      } catch (err) {
        handleErrorResponse(err, res, Model);
      }
    },
  };
  let props = {};

  return Object.create(proto, props);
};
