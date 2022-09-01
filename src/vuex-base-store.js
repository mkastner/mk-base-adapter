// this is a modified copy of vuex-base-store from mk-base-adapter
import qs from 'qs';
import axios from 'axios';

export default function BaseStore(endpointUrl, options, hookOptions) {
  let listKey = 'docs';
  let idName = 'id';
  let copyPrefix = '';
  let copyPostfix = '';
  let copyInclude = [];
  let copyExclude = [];

  if (options) {
    if (options.listKey) {
      listKey = options.listKey;
    }
    if (options.idName) {
      idName = options.idName;
    }
    if (options.copyPrefix) {
      copyPrefix = options.copyPrefix;
    }
    if (options.copyPostfix) {
      copyPostfix = options.copyPostfix;
    }
    if (options.copyInclude) {
      copyInclude = options.copyInclude;
    }
    if (options.copyExclude) {
      copyExclude = options.copyExclude;
    }
  }

  const hooks = {
    create() {},
    state() {},
  };

  if (hookOptions) {
    for (let key in hookOptions) {
      hooks[key] = hookOptions[key];
    }
  }

  const newStore = Object.create({
    namespaced: true,
  });

  newStore.state = {
    //helper states
    // { type: ['fetch', 'update', 'create']}
    api: null,
    //
    listKey,
    scope: {},
    in: {},
    order: [], //{ by: '', direction: '[ASC|DESC]'},
    search: {}, // eg. title: 'Bauen', subtitle: 'haus'
    list: [], // all items – paginated
    range: [],
    pagination: {
      page: 1,
      pageSize: 10,
      pages: 1,
      total: 1,
    },
  };

  newStore.getters = {
    // state allGetters, rootState
    current(state, allGetters, rootState) {
      let id = rootState.route.params.id;
      if (!isNaN(id)) {
        // if id is a number convert it to integer
        id = parseInt(id);
      }
      const foundItem = state.list.find((t) => t[idName] === id);
      return foundItem;
    },
    orderBy(state) {
      return (by) => {
        //if (!by) { throw new Error('getter "orderBy" require argument "by"'); }
        const index = state.order.findIndex((o) => o.by === by);
        if (index !== -1) {
          const foundOrder = state.order[index];
          return { priority: index, direction: foundOrder.direction };
        }
        return {};
      };
    },
  };
  newStore.actions = {
    setPageSize({ commit }, pageSize) {
      commit('SET_PAGINATION', { pageSize });
    },
    setPage({ commit }, page) {
      commit('SET_PAGINATION', { page });
    },
    search({ commit, dispatch }, search) {
      commit('SET_PAGINATION', { page: 1 });
      commit('SET_SEARCH', search);
      dispatch('fetch', search);
    },
    clearSearch({ commit }) {
      commit('CLEAR_SEARCH');
    },
    update({ commit }, { id, fields }) {
      commit('PATCH', { id, fields });
      let url = `${endpointUrl}/${id}`;
      return axios.patch(url, fields).then((result) => {
        if (result.data.error) {
          throw new Error(result.data.error);
        }
      });
    },
    copy({ commit }, id) {
      if (!id) {
        throw new Error('id missing');
      }
      const url = `${endpointUrl}/copy/${id}`;

      const body = {
        include: copyInclude,
        exclude: copyExclude,
        prefix: copyPrefix,
        postfix: copyPostfix,
      };

      return axios
        .post(url, body)
        .then((res) => {
          if (res.data.error) {
            return console.error(res.data.error);
          }
          commit('ADD', res.data);
        })
        .catch((err) => {
          console.error(err);
        });
    },
    delete({ commit }, id) {
      if (!id) {
        throw new Error('id missing');
      }
      const url = `${endpointUrl}/${id}`;
      return axios.delete(url).then(() => {
        return Promise.resolve(commit('DELETE', id));
      });
    },
    read({ commit, state }, id) {
      if (!id) {
        throw new Error('id missing');
      }
      let url = `${endpointUrl}/${id}`;
      return axios.get(url).then((result) => {
        if (result.data.error) {
          throw new Error(result.data.error);
        }
        const readItem = result.data;
        /* must be commit 
        const index = state.list.findIndex(t => t.id === parseInt(id)); 
        if (index !== -1) {
          for (let key in readItem) {
            Vue.set(state.list[i], key, readItem[key]);
          } 
        }
        */
        return readItem;
      });
    },
    changeOrder({ state, commit, dispatch }, by) {
      const orderIndex = state.order.findIndex((o) => o.by === by);
      if (orderIndex === -1) {
        // order was not found: create it
        commit('ADD_ORDER', { by, direction: 'ASC' });
      } else {
        const foundOrder = state.order[orderIndex];
        const direction = foundOrder.direction === 'ASC' ? 'DESC' : 'ASC';
        commit('SET_ORDER', { orderIndex, direction });
      }
      dispatch('fetch');
    },
    fetch({ commit, state }) {
      const query = {
        scope: state.scope,
        page: state.pagination.page,
        pageSize: state.pagination.pageSize,
        order: state.order,
        in: state.in,
        range: state.range,
      };

      if (state.search) {
        query.search = state.search;
      }

      const queryString = qs.stringify(query, { encodeValuesOnly: true });
      const url = `${endpointUrl}?${queryString}`;

      // currently SET_START_API and SET_END_API
      // is only implemented for fetch
      // it should eventually be implemented for
      // all API calls.
      commit('SET_START_API', { type: 'fetch' });

      return axios
        .get(url)
        .then((res) => {
          if (res.data.error) {
            console.error(res.data.error);
            throw new Error(res.data.error);
          }

          commit('CLEAR_LIST');

          const pagination = res.data.pagination;

          const docs = res.data[state.listKey];

          for (let i = 0, l = docs.length; i < l; i++) {
            let doc = docs[i];
            commit('ADD', doc);
          }

          commit('SET_PAGINATION', pagination);
          commit('SET_END_API');
          return res.data;
        })
        .catch((err) => {
          console.error(err);
        });
    },
    updateField({ commit, rootState }, { name, value }) {
      commit('UPDATE_FIELD', { name, value, rootState });
    },
    create({ commit }, newObj) {
      newObj = newObj || {};
      hooks.create(newObj);
      // use hooks.create e.g. for setting defaults
      return axios
        .post(endpointUrl, newObj)
        .then((res) => {
          if (res.error) {
            console.error(res.error);
          } else {
            commit('ADD', res.data);
            return res.data;
          }
        })
        .catch((err) => {
          console.error(err);
        });
    },
    deleteBatch({ commit }, ids) {
      commit('DELETE_BATCH', ids);
      const url = `${endpointUrl}/batch-delete`;
      return axios.post(url, ids).then((result) => {
        if (result.data.error) {
          throw new Error(result.data.error);
        }
      });
    },
    // on response replace existing record attributes
    patchBatch({ dispatch }, list) {
      const url = `${endpointUrl}/batch-upsert`;
      return axios.post(url, list).then((result) => {
        if (result.data.error) {
          throw new Error(result.data.error);
        }
        for (let i = 0, l = result.data.length; i < l; i++) {
          const resItem = result.data[i];
          dispatch('patch', { id: resItem.id, fields: resItem });
        }
      });
    },
    // list all items
    // on response clear all and add
    // items from response
    upsertBatch({ commit }, list) {
      const url = `${endpointUrl}/batch-upsert`;
      return axios.post(url, list).then((result) => {
        commit('CLEAR_LIST');
        if (result.data.error) {
          throw new Error(result.data.error);
        }
        for (let i = 0, l = result.data.length; i < l; i++) {
          const createdCell = result.data[i];
          if (createdCell) {
            //console.log('createdCell', createdCell);
            commit('ADD', createdCell);
          } else {
            //console.warn('createdCell is', createdCell);
          }
        }
        return result.data;
      });
    },
    patch({ commit }, { id, fields }) {
      if (!fields) {
        throw new Error('no patch fields');
      }
      commit('PATCH', { id, fields });
    },
    setScope({ commit }, scope) {
      commit('SET_SCOPE', scope);
    },
    removeScope({ commit }, key) {
      commit('REMOVE_SCOPE', key);
    },
    setIn({ commit }, inData) {
      commit('SET_SCOPE', inData);
    },
  };

  newStore.mutations = {
    SEARCH(state, search) {
      state.search = search;
    },
    SET_PAGINATION(state, obj) {
      for (let key in obj) {
        state.pagination[key] = obj[key];
      }
    },
    ADD_ORDER(state, { by, direction }) {
      // splice(insertAt 0, remove 0, object);
      state.order.splice(0, 0, { by, direction });
    },
    // changed order becomes primary order
    // i.e. will become first in order
    SET_ORDER(state, { orderIndex, direction }) {
      const keepOrder = state.order[orderIndex];
      keepOrder.direction = direction;
      // remove from old Position
      state.order.splice(orderIndex, 1);
      state.order.splice(0, 0, keepOrder);
    },
    CLEAR_ORDER(state) {
      state.order.splice(0);
    },
    CLEAR_LIST(state) {
      state.list.splice(0);
    },
    UPDATE_FIELD(state, { name, value, rootState }) {
      if (state.newArticle) {
        state.newArticle[name] = value;
      } else {
        let article = state.list.find((t) => {
          return t.id === rootState.route.params.id;
        });
        article[name] = value;
      }
    },
    ADD(state, item) {
      state.list.push(item);
    },
    PATCH(state, { id, fields }) {
      if (!fields) {
        throw new Error('no fields for PATCH');
      }
      const index = state.list.findIndex((item) => item[idName] === id);

      console.log('PATCH index', index);

      for (let key in fields) {
        console.log('PATCH key  ', key);
        console.log('PATCH value', fields[key]);
        state.list[index][key] = fields[key];
      }
    },
    SET_SEARCH(state, search) {
      if (!search) {
        console.warn(`trying to set ${search} to search`);
      }
      if (!state.search) {
        state['search'] = {};
      }
      for (let key in search) {
        state.search[key] = search[key];
      }
    },
    CLEAR_SEARCH(state) {
      if (state.search) {
        for (let key in state.search) {
          delete state.search[key];
        }
        delete state['search'];
      }
    },
    // inData
    SET_IN(state, inData) {
      if (!state.in) {
        state['in'] = {};
      }

      for (let key in inData) {
        state.in[key] = inData[key];
      }
    },
    SET_START_API(state, info) {
      state.api = info;
    },
    SET_END_API(state) {
      state.api = null;
    },
    SET_SCOPE(state, scope) {
      if (!state.scope) {
        state['scope'] = {};
      }

      for (let key in scope) {
        state['scope'][key] = scope[key];
      }
    },
    REMOVE_SCOPE(state, key) {
      if (!state.scope) {
        return false;
      }

      if (state.scope[key]) {
        delete state.scope[key];
      }
    },
    DELETE(state, id) {
      const index = state.list.findIndex((t) => t[idName] === id);
      state.list.splice(index, 1);
    },
  };

  hooks.state(newStore.state);

  return newStore;
}
