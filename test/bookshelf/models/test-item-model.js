const Bookshelf = require('../db/database');

const TestItem = Bookshelf.Model.extend({
  tableName: 'test_items',
  debug: true,
  hasTimestamps: true
});

// Bookshelf.model is function of
// plugin registry

module.exports = Bookshelf.model('TestItem', TestItem);
module.exports = TestItem;
