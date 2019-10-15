const Bookshelf = require('../db/database');

const TestJob = Bookshelf.Model.extend({
  tableName: 'jobs',
  debug: true,
  hasTimestamps: true
});

// Bookshelf.model is function of
// plugin registry

module.exports = Bookshelf.model('Job', TestJob);
module.exports = TestJob;
