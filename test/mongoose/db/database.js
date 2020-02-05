const mongoose = require('mongoose');
const dbUrl = 'mongodb://10.66.66.17/mk_base_adapter_test';
const log = 'mk-log';

const connectOptions = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true
};

mongoose.connect(dbUrl, connectOptions, (err) => {

  if (err) {
    log.error(err);
    log.error(err.stack);
  }

});

