const env = process.env.NODE_ENV;
if (env !== 'test') {
  throw new Error('Tests must be run in test env');
}
const log = require('mk-log');

module.exports = async function clearTable(model) {
  try {
    
    return model.deleteMany(); 

  } catch (err) {
    log.error(err);
    return Promise.reject(err); 
  }
};

