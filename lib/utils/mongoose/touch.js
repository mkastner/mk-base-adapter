const mongoose = require('mongoose');
const log = require('mk-log');

module.exports = async function touch(id, Model) {
  const objectId = mongoose.Types.ObjectId(id);
  const timestamp = mongoose.Types.ObjectId().getTimestamp();
  log.debug('timestamp', timestamp);
  const result = await Model.collection.findOneAndUpdate(
    { _id: objectId },
    { $set: { updatedAt: timestamp } },
    { returnDocument: 'after' }
    // using returnDocument
    // returnNewDoument not working on node.js
  );
  log.debug('result', result);
  return result;
};
