module.exports = function createModelOptions(options) {
  const listKey = 'docs';
  const timestampFields = { updated: 'updated_at', created: 'created_at' };
  const result = {
    listKey,
    timestampFields,
  };
  if (!options) {
    return result;
  }

  result.listKey ||= options.listKey;
  if (options.timestampFields) {
    Object.assign(result.timestampFields, options.timestampFields);
  }
  /* 
    if (options.dateFormat) {
      dateFormat = options.dateFormat; 
    }*/
  return result;
};
