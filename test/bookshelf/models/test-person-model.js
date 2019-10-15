const Bookshelf = require('../db/database');

const TestPerson = Bookshelf.Model.extend({
  tableName: 'persons',
  debug: true,
  hasTimestamps: true
});

// Bookshelf.model is function of
// plugin registry

module.exports = Bookshelf.model('Person', TestPerson);
module.exports = TestPerson;
