const crypto = require('crypto');
const shasum = crypto.createHash('sha1');

module.exports = function createHash(s) {
  shasum.update(s);
  return shasum.digest('hex');
};
