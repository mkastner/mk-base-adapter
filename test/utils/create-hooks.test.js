const tape = require('tape');
// const log = require('mk-log');
const createHooks = require('../../lib/utils/create-hooks.js');
function fakeQuery(withRelated) {
  return { docs: [{ related: withRelated }], page: 1 };
}

tape((test) => {
  const hooks = createHooks((hookObj) => {
    hookObj.list.before = () => {};
    hookObj.list.withRelated = (related) => {
      related.push('relatedRecords');
    };
    hookObj.list.after = (result) => {
      result.page += 1;
    };
  });
  const fakeAdapter = (newHooks) => {
    const hooks = newHooks ? newHooks : createHooks();

    return {
      list(_req, _res) {
        const withRelated = [];
        hooks.list.withRelated(withRelated);
        test.ok(withRelated.indexOf('relatedRecords') !== -1);
        const result = fakeQuery(withRelated);
        hooks.list.after(result);
        test.ok(result.page === 2);
      },
    };
  };

  const req = {};
  const res = {};
  fakeAdapter(hooks).list(req, res);
  test.end();
});
