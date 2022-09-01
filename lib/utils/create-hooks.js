function createHookOptions() {
  return {
    after() {}, // after query execution
    before() {}, // before query execution
    query() {}, // query object
    result() {}, // result object right before response
    withRelated() {}, // was []
  };
}

module.exports = function createHooks(cb) {
  const copy = createHookOptions();
  const create = createHookOptions();
  const list = createHookOptions();
  const read = createHookOptions();
  const remove = createHookOptions();
  const removeMultiple = createHookOptions();
  const touch = createHookOptions();
  const update = createHookOptions();
  const upsertMultiple = createHookOptions();

  const hooks = {
    copy,
    create,
    list,
    read,
    remove,
    removeMultiple,
    touch,
    update,
    upsertMultiple,
    //modified: { withRelated: [], query() {} }
  };

  if (cb) {
    cb(hooks);
  }

  return hooks;
};
