module.exports = function createHooks(options) {
  const hooks = {
    create: { before() {}, after() {} },
    update: { before() {}, after() {} },
    remove: { before() {}, after() {} },
    upsertMultiple: { before() {}, after() {} },
    removeMultiple: { before() {}, after() {} },
    read: { before() {}, after() {}, withRelated: [], query() {} },
    touch: { before() {}, after() {}, withRelated: [], query() {} },
    list: { before() {}, after() {}, withRelated: [], query() {} },
    //modified: { withRelated: [], query() {} }
  };

  if (!options) return hooks;

  return Object.assign({}, hooks, options);

};
