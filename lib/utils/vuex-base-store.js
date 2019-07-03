const Vue = require('vue');
const qs = require('qs');
const axios = require('axios');

function cndns(s) {
  if (!s) return '';
  s.replace(/ +/gm, ' ');
}

function createStateObj(stateHook) {
  const state = {
    scope: {},
    in: {},
    order: [],//{ by: '', direction: '[ASC|DESC]'}, 
    search: {}, // eg. title: 'Bauen', subtitle: 'haus'
    list: [], // all items – paginated
    range: [], 
    pagination: {
      page: 1,
      pageSize: 10,
      pages: 1,
      total: 1
    } 
  };
  stateHook(state);
  return state;
}

module.exports = function VuexBaseStore(endpointUrl, options = {}, hookOptions = {}) {

  const hooks = {
    state: hookOptions['state'] || function () {},
    create: hookOptions['create'] || function () {}
  };

  let listKey = 'docs';

  if (options) {
    if (options.listKey) {
      listKey = options.listKey; 
    } 
  }

  const state = createStateObj(hooks.state);

  return {
    namespaced: true,
    state, 
    /*
    state: () => ({
      scope: { },
      in: {},
      order: [],//{ by: '', direction: '[ASC|DESC]'}, 
      search: {}, // eg. title: 'Bauen', subtitle: 'haus'
      list: [], // all items – paginated
      range: [], 
      pagination: {
        page: 1,
        pageSize: 10,
        pages: 1,
        total: 1
      } 
    }),
    */
    getters: {
      // state allGetters, rootState
      current(state, allGetters, rootState) {
        const id = rootState.route.params.id;
        return state.list.find(t => t.id === parseInt(id)); 
      }
    },
    actions: {
      setPageSize({commit}, pageSize) {
        commit('SET_PAGINATION', {pageSize});  
      },
      setPage({commit}, page) {
        commit('SET_PAGINATION', {page});  
      },
      search({commit, dispatch}, search) {
        commit('SET_PAGINATION', {page: 1}); 
        commit('SET_SEARCH', search); 
        dispatch('fetch', search);
      },
      clearSearch({commit}) {
        commit('CLEAR_SEARCH');
      }, 
      update({commit}, {id, fields}) {
        commit('PATCH', {id, fields}); 
        let url = `${endpointUrl}/${id}`;
        return axios.patch(url, fields).then(result => {
          if (result.data.error) {
            throw new Error(result.data.error);
          }
        });
      }, 
      delete({ commit}, id) {
        if (!id) {
          throw new Error('id missing');
        } 
        const url = `${endpointUrl}/${id}`; 
        return axios.delete(url).then( () => {
          return Promise.resolve(commit('DELETE', id));
        }); 

      },
      read({commit, state}, id) {
        if (!id) {
          throw new Error('id missing');
        }
        let url = `${endpointUrl}/${id}`;
        return axios.get(url).then(result => {
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
      changeOrder({state, commit, dispatch}, by) {
        const orderIndex = state.order.findIndex(o => o.by === by);
        if (orderIndex === -1) {
          // order was not found: create it
          commit('ADD_ORDER', { by, direction: 'ASC' }); 
        } else {
          const foundOrder = state.order[orderIndex];
          const direction = foundOrder.direction === 'ASC' ? 'DESC' : 'ASC';
          commit('SET_ORDER', { orderIndex, direction  });
        }
        dispatch('fetch');
      }, 
      fetch({commit, state}) {
        const query = {
          scope: state.scope,
          page: state.pagination.page, 
          pageSize: state.pagination.pageSize, 
          order: state.order,
          in: state.in,
          range: state.range
        }; 

        if (state.search) {
          query.search = state.search;
        }
        
        const queryString = qs.stringify(query, { encodeValuesOnly: true });
        const url = `${endpointUrl}?${queryString}`;
        
        return axios.get(url).then((res) => {

          if (res.data.error) {
            console.error(res.data.error);
            throw new Error(res.data.error); 
          }

          commit('CLEAR_LIST');

          const pagination = res.data.pagination;
          const docs = res.data[listKey];

          for (let i = 0, l = docs.length; i < l; i++) {
            let doc = docs[i];
            commit('ADD', doc);
          } 
          
          commit('SET_PAGINATION', pagination);  

          return res.data;

        }).catch((err) => {
          console.error(err); 
        });
      },
      updateField({commit, rootState}, {name, value}) {
        commit('UPDATE_FIELD', {name, value, rootState}); 
      },
      create({state, commit}, newObj) {
        newObj = newObj || {}; 
        hooks.create(newObj)
        // use hooks.create e.g. for setting defaults
        return axios.post(endpointUrl, newObj)
          .then((res) => {
            if (res.error) {
              console.error(res.error); 
            } else {
              commit('ADD', res.data);
              return res.data; 
            }
          }).catch((err) => {
            console.error(err); 
          });
      },
      deleteBatch({commit}, ids) {
        commit('DELETE_BATCH', ids); 
        const url = `${endpointUrl}/batch-delete`;
        return axios.post(url, ids) .then(result => {
          if (result.data.error) {
            throw new Error(result.data.error);
          }
        }); 
      },
      // on response replace existing record attributes
      patchBatch({dispatch}, list) {
        const url = `${endpointUrl}/batch-upsert`;
        return axios.post(url, list).then(result => {
          if (result.data.error) {
            throw new Error(result.data.error);
          }
          for (let i = 0, l = result.data.length; i < l; i++) { 
            const resItem = result.data[i];
            console.log('resItem', resItem); 
            dispatch('patch', {id: resItem.id, fields: resItem});
          }
        });
      },
      // list all items
      // on response clear all and add 
      // items from response
      upsertBatch({commit}, list) {
        const url = `${endpointUrl}/batch-upsert`;
        return axios.post(url, list).then(result => {
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
      patch({commit}, {id, fields}) {
        if (!fields) {
          throw new Error('no patch fields'); 
        }
        commit('PATCH', {id, fields});  
      }, 
      setScope({commit}, scope) {
        commit('SET_SCOPE', scope); 
      }

    },
    mutations: {
      SEARCH(state, search) {
        state.search = search;
      }, 
      SET_PAGINATION(state, obj) {
        for (let key in obj) {
          state.pagination[key] = obj[key]; 
        }
      }, 
      ADD_ORDER(state, {by, direction}) {
        // splice(insertAt 0, remove 0, object);
        state.order.splice(0, 0, {by, direction});
      },
      // changed order becomes primary order
      // i.e. will become first in order
      SET_ORDER(state, {orderIndex, direction}) {
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
      UPDATE_FIELD(state, {name, value, rootState}) {

        if (state.newArticle) {
          Vue.set(state.newArticle, name, value); 
        } else {
          let article = state.list.find((t) => { 
            return t.id === rootState.route.params.id; 
          });
          Vue.set(article, name, value); 
        } 
      
      },
      ADD(state, article) {
        state.list.push(article);
      },
      PATCH(state, {id, fields}) {
        if (!fields) {
          throw new Error('no fields for PATCH');
        }
        const index = state.list.findIndex(item => item.id === id);
        for (let key in fields) {
          Vue.set(state.list[index], key,  fields[key]); 
        }
      },
      SET_SEARCH(state, search) {
        if (!search) {
          console.warn(`trying to set ${search} to search`);
        } 
        if (!state.search) {
          Vue.set(state, 'search', {});
        } 
        for (let key in search) {
          Vue.set(state.search, key, search[key]); 
        } 
      },
      CLEAR_SEARCH(state) {
        if (state.search) {
          for(let key in state.search) {
            Vue.delete(state.search, key);
          }
          Vue.delete(state, 'search');
        } 
      },
      SET_SCOPE(state, scope) {
        
        if (!scope) {
          state.scope = {}; 
        }
     
        for (let key in scope) {
          Vue.set(state.scope, key, scope[key]); 
        }

      }
    }
  };
};