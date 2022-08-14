const log = require('mk-log');
const queryValues = require('./utils/query-values');
const comparatorToSymbol = require('./utils/comparator-to-symbol');
const createHooks = require('./utils/create-hooks.js');
const createModelOptions = require('./utils/create-model-options.js');

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

module.exports = function BookshelfAdapter(Model, options, hookOptions) {
  if (!Model) {
    throw new Error('Model required');
  }

  const hooks = createHooks(hookOptions);

  const { listKey, timestampFields } = createModelOptions(options);
  let proto = {
    async create(req, res) {
      try {
        if (hooks.create.before) {
          hooks.create.before(req);
        }
        const newModel = new Model(req.body);
        const rawSavedModel = await newModel.save();
        const savedModel = rawSavedModel.toJSON();

        if (hooks.create.after) {
          hooks.create.after(req, savedModel);
        }
        res.status(200).json(savedModel);
      } catch (err) {
        log.error(err);
        res.status(500).json({ error: err });
      }
    },

    async remove(req, res) {
      try {
        if (hooks.remove.before) {
          hooks.create.before(req.body, req);
        }
        let id = req.params.id;

        const destroyed = await Model.forge()
          .where({ id: id })
          .destroy();
        log.debug('destroyed', destroyed);

        if (hooks.remove.after) {
          hooks.remove.after(req.body, req);
        }
        res.status(200).json(destroyed.toJSON());
      } catch (err) {
        log.error(err);
        res.status(500).json({ error: err });
      }
    },

    async removeMultiple(req, res) {
      try {
        if (hooks.removeMultiple.before) {
          hooks.removeMultiple.before(req);
        }
        const ids = req.body;
        const destroyed = await Model.forge()
          .query((qb) => {
            qb.whereIn('id', ids);
          })
          .destroy();

        const destroyedResult = destroyed.toJSON();

        log.debug('destroyedResult', destroyedResult);

        if (hooks.removeMultiple.before) {
          hooks.removeMultiple.after(req, destroyedResult);
        }
        res.status(200).json(destroyedResult);
      } catch (err) {
        log.error(err);
        res.status(500).json({ error: err });
      }
    },

    async update(req, res) {
      try {
        if (hooks.update.before) {
          hooks.update.before(req);
        }
        const model = new Model({ id: req.params.id });
        const data = req.body;

        deleteAutoProps(data);

        log.debug('id', req.params.id);
        log.debug('data', req.body);

        const savedModel = await model.save(data, { patch: true });
        if (hooks.update.after) {
          hooks.update.after(req, savedModel);
        }
        res.status(200).json(savedModel.toJSON());
      } catch (err) {
        log.error(err);
        res.status(500).json(JSON.stringify({ error: err }));
      }
    },

    async upsertMultiple(req, res) {
      try {
        if (hooks.upsertMultiple.before) {
          hooks.upsertMultiple.before(req);
        }

        const rawLatestRecord = await Model.query((qb) => {
          qb.orderBy('id', 'DESC');
          qb.limit(1);
        }).fetch({ require: false });

        const data = req.body;

        log.debug('data', data);

        const updateIds = [];

        for (let i = 0, l = data.length; i < l; i++) {
          const item = data[i];
          if (item.id) {
            updateIds.push(item.id);
          }
        }

        const batchUpdateResult = await Model.batchUpdate(data);

        log.debug('batchUpdateResult', batchUpdateResult);

        let rawCreatedRecords;
        if (rawLatestRecord) {
          const latestRecord = rawLatestRecord.toJSON();
          log.debug('rawLatestRecord', rawLatestRecord);
          rawCreatedRecords = await Model.query((qb) => {
            qb.where('id', '>', latestRecord.id);
          }).fetchAll();
        } else {
          rawCreatedRecords = await Model.query((qb) => {
            qb.where('id', '>', 0);
          }).fetchAll();
        }

        let updatedRecords = [];

        if (updateIds && updateIds.length) {
          const rawUpdatedRecords = await Model.query((qb) => {
            log.info('updateIds', updateIds);

            qb.whereIn('id', updateIds);
          }).fetchAll();
          updatedRecords = rawUpdatedRecords.toJSON();
        }

        const createdRecords = rawCreatedRecords.toJSON();
        const resultRecords = updatedRecords.concat(createdRecords);

        if (hooks.upsertMultiple.after) {
          hooks.upsertMultiple.after(req, resultRecords);
        }

        res.status(200).json(resultRecords);
      } catch (err) {
        log.error(err);
        res.status(500).json(JSON.stringify({ error: err }));
      }
    },

    async read(req, res) {
      try {
        if (hooks.read.before) {
          hooks.read.before(req);
        }
        let query = Model.query((qb) => {
          hooks.read.query(qb);
          qb.where({ id: req.params.id });
        });
        let rawResult = await query.fetch();
        if (hooks.read.after) {
          hooks.read.after(req);
        }
        res.status(200).json(rawResult.toJSON());
      } catch (err) {
        log.error(err);
        res.status(200).json({ error: err });
      }
    },

    async touch(req, res) {
      // optional: req.body.timeField
      // e.g. changed_at
      try {
        if (hooks.read.before) {
          hooks.touch.before(req);
        }
        const newModel = new Model({ id: req.params.id });
        const touchResult = await newModel.touch(req.body.timeField);
        if (hooks.touch.after) {
          hooks.touch.after(req);
        }
        res.status(200).json(touchResult.toJSON());
      } catch (err) {
        log.error(err);
        res.status(200).json({ error: err });
      }
    },

    async list(req, res) {
      try {
        log.debug('mk-base-adapter list req query', req.query);

        let withRelated = [];

        if (hooks.list.withRelated) {
          withRelated = hooks.list.withRelated;
        }

        const page = req.query.page || 1;
        const pageSize = req.query.pageSize || 10;

        if (hooks.list.before) {
          hooks.list.before(req);
        }

        const query = Model.query((qb) => {
          if (hooks.list.query) {
            hooks.list.query(qb, req);
          }

          queryValues(req.query, 'in', (field, list) => {
            qb.whereIn(field, list);
          });

          queryValues(req.query, 'scope', (field, val) => {
            log.info('scope field    ', field);
            log.info('scope val      ', val);
            qb.where(field, '=', `${val}`);
          });

          queryValues(req.query, 'search', (keys, values) => {
            //log.info('raw', raw);
            //log.info('args', args);
            const raw =
              '(' +
              keys.map((key) => `upper(${key}) LIKE ?`).join(' OR ') +
              ')';
            const args = values.map((val) => `%${val}%`);
            qb.whereRaw(raw, args);
          });

          queryValues(req.query, 'order', (field, direction) => {
            log.debug('order field    ', field);
            log.debug('order direction', direction);
            qb.orderBy(field, direction);
          });

          queryValues(req.query, 'range', (field, comp, val) => {
            const compSym = comparatorToSymbol(comp);
            qb.where(field, compSym, val);
          });

          //qb.debug(true);
        });

        const rawResult = await query.fetchPage({
          page,
          pageSize,
          withRelated
        });

        const JSONResult = {
          pagination: {
            page: rawResult.pagination.page,
            pageSize: rawResult.pagination.pageSize,
            total: rawResult.pagination.rowCount,
            pages: rawResult.pagination.pageCount
          }
        };

        JSONResult.pagination.nextPage =
          JSONResult.pagination.page < JSONResult.pagination.pages
            ? parseInt(page) + 1
            : null;
        JSONResult.pagination.prevPage =
          JSONResult.pagination.page > 1 ? page - 1 : null;
        JSONResult.pagination.hasNextPage = JSONResult.pagination.nextPage
          ? true
          : false;
        JSONResult.pagination.hasPrevPage = JSONResult.pagination.prevPage
          ? true
          : false;

        log.debug('base-dapter pagination', JSONResult.pagination);

        JSONResult[listKey] = rawResult.toJSON({
          virtuals: req.query.lean !== 'true'
        });

        if (hooks.list.after) {
          hooks.list.after(req, JSONResult);
        }

        res.status(200).json(JSONResult);
      } catch (err) {
        log.error(err);
        res.status(500).send({ error: err });
      }
    }
  };

  let props = {};

  return Object.create(proto, props);
};
