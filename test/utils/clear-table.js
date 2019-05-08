const log = require('mk-log');

module.exports = async function clearTable(model) {
  try {
    let result = await model.where('id', '>', 0);
    let count = await result.count();
    if (count > 0) {
      await model.where('id', '>', 0).destroy();
    }
  } catch (err) {
    log.error(err);
    return Promise.reject(err); 
  }
};

