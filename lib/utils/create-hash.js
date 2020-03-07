module.exports = function createHash(s) {
  return require('crypto')
    .createHash('sha1')
    .update(s)
    .digest('hex');
};
