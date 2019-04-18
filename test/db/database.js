const log = require('mk-log');
const knexConfig = require('./knexfile');
const batchUpdatePlugin = require('../../lib/bookshelf-plugins/batch-update-plugin');
log.info('knexConfig', knexConfig);

const knex = require('knex')(knexConfig);
const bookshelf = require('bookshelf')(knex);

bookshelf.plugin(batchUpdatePlugin);
bookshelf.plugin('registry');
//bookshelf.plugin('virtuals');
//bookshelf.plugin('visibility');
//bookshelf.plugin('bookshelf-scopes');
bookshelf.plugin('pagination');

module.exports = bookshelf;
