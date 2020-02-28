//const path = require('path');
//const assetsRootDir = require('../../../config/env/test-config').assetsRootDir;
const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig);
const bookshelf = require('bookshelf')(knex);
const log = require('mk-log');
const assetPlugin = require('../../../lib/bookshelf-plugins/asset-plugin');
const batchUpdatePlugin = require('../../../lib/bookshelf-plugins/batch-update-plugin');
const touchPlugin = require('../../../lib/bookshelf-plugins/touch-plugin');
const assetsConfig = require('../../assets/assets-config.js');

bookshelf.plugin(batchUpdatePlugin);
bookshelf.plugin(touchPlugin);
bookshelf.plugin(assetPlugin, assetsConfig); 

bookshelf.plugin('bookshelf-virtuals-plugin');
//bookshelf.plugin('visibility');
//bookshelf.plugin('bookshelf-scopes');

log.info('knexConfig', knexConfig);

module.exports = bookshelf;
