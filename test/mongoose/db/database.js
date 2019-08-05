const mongoose = require('mongoose');
const dbUrl = 'mongodb://localhost/mk_base_adapter_test';
const log = 'mk-log';

const connectOptions = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true
};

mongoose.connect(dbUrl, connectOptions, (err) => {

  if (err) {
    log.error(err);
    log.error(err.stack);
  }

});

