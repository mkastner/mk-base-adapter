const log = require('mk-log');

module.exports = (err, res, Model) => {
  const modelName = Model ? Model.constructor.name : 'model missing';
  log.error(`Error in adapter for model ${modelName}`);
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
