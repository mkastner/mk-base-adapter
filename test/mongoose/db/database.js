const mongoose = require('mongoose');
const dbUrl = 'mongodb://127.0.0.1:27017/mk_base_adapter_test';
const log = require('mk-log');

function onConnect() {
  log.info('connected to', dbUrl);
}

function onError(err) {
  if (err) {
    log.error(err);
    log.error(err.stack);
  }
}

const connectOptions = {
  useNewUrlParser: true,
  //useFindAndModify: false,
  //useCreateIndex: true,
  useUnifiedTopology: true,
};

// errors after connection is initialized
mongoose.connection.on('error', (err) => {
  log.error(err);
  log.error(err.stack);
});

// errors on initializing connection
mongoose.connect(dbUrl, connectOptions).then(onConnect, onError);
