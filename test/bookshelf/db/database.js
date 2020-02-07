const log = require('mk-log');
const knexConfig = require('./knexfile');
const batchUpdatePlugin = require('../../../lib/bookshelf-plugins/batch-update-plugin');
const touchPlugin = require('../../../lib/bookshelf-plugins/touch-plugin');

log.info('knexConfig', knexConfig);

const knex = require('knex')(knexConfig);
const bookshelf = require('bookshelf')(knex);

bookshelf.plugin(batchUpdatePlugin);
bookshelf.plugin(touchPlugin);

//bookshelf.plugin('registry');
//bookshelf.plugin('virtuals');
//bookshelf.plugin('visibility');
//bookshelf.plugin('bookshelf-scopes');
//bookshelf.plugin('pagination');

module.exports = bookshelf;
