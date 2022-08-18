const log = require('mk-log');

module.exports = function handleErrorResponse(err, res) {
  if (err.name === 'ValidationError') {
    const errorObj = {
      error: {
        name: err.name,
        message: 'Fehler bei der Datenspeicherung',
      },
    };
    if (err.errors) {
      errorObj.error.errors = {};
      for (let key in err.errors) {
        errorObj.error.errors[key] = {};
        errorObj.error.errors[key].message = err.errors[key].message;
        errorObj.error.errors[key].name = err.errors[key].name;
      }
    }
    log.error(errorObj);
    return res.status(200).json(errorObj);
  }
  // any other error is considered a system error
  log.error(err);
  return res.status(500).json({ error: err });
};
