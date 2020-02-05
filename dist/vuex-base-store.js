(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("vue"), require("qs"), require("axios"));
	else if(typeof define === 'function' && define.amd)
		define(["vue", "qs", "axios"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("vue"), require("qs"), require("axios")) : factory(root["vue"], root["qs"], root["axios"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(window, function(__WEBPACK_EXTERNAL_MODULE__2__, __WEBPACK_EXTERNAL_MODULE__3__, __WEBPACK_EXTERNAL_MODULE__4__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(1);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

const Vue = __webpack_require__(2);

const qs = __webpack_require__(3);

const axios = __webpack_require__(4);

module.exports = function VuexBaseStore(endpointUrl, options, hookOptions) {
  let listKey = 'docs';
  let idName = 'id';

  if (options) {
    if (options.listKey) {
      listKey = options.listKey;
    }

    if (options.idName) {
      idName = options.idName;
    }
  }

  const hooks = {
    create() {},

    state() {}

  };

  if (hookOptions) {
    for (let key in hookOptions) {
      hooks[key] = hookOptions[key];
    }
  }

  const newStore = Object.create({
    namespaced: true
  });
  newStore.state = {
    listKey,
    scope: {},
    in: {},
    order: [],
    //{ by: '', direction: '[ASC|DESC]'}, 
    search: {},
    // eg. title: 'Bauen', subtitle: 'haus'
    list: [],
    // all items – paginated
    range: [],
    pagination: {
      page: 1,
      pageSize: 10,
      pages: 1,
      total: 1
    }
  };
  newStore.getters = {
    // state allGetters, rootState
    current(state, allGetters, rootState) {
      let id = rootState.route.params.id;

      if (!isNaN(id)) {
        // if id is a number convert it to integer
        id = parseInt(id);
      }

      const foundItem = state.list.find(t => t[idName] === id);
      return foundItem;
    },

    orderBy(state) {
      return by => {
        //if (!by) { throw new Error('getter "orderBy" require argument "by"'); } 
        const index = state.order.findIndex(o => o.by === by);

        if (index !== -1) {
          const foundOrder = state.order[index];
          return {
            priority: index,
            direction: foundOrder.direction
          };
        }

        return {};
      };
    }

  }, newStore.actions = {
    setPageSize({
      commit
    }, pageSize) {
      commit('SET_PAGINATION', {
        pageSize
      });
    },

    setPage({
      commit
    }, page) {
      commit('SET_PAGINATION', {
        page
      });
    },

    search({
      commit,
      dispatch
    }, search) {
      commit('SET_PAGINATION', {
        page: 1
      });
      commit('SET_SEARCH', search);
      dispatch('fetch', search);
    },

    clearSearch({
      commit
    }) {
      commit('CLEAR_SEARCH');
    },

    update({
      commit
    }, {
      id,
      fields
    }) {
      commit('PATCH', {
        id,
        fields
      });
      let url = `${endpointUrl}/${id}`;
      return axios.patch(url, fields).then(result => {
        if (result.data.error) {
          throw new Error(result.data.error);
        }
      });
    },

    delete({
      commit
    }, id) {
      if (!id) {
        throw new Error('id missing');
      }

      const url = `${endpointUrl}/${id}`;
      return axios.delete(url).then(() => {
        return Promise.resolve(commit('DELETE', id));
      });
    },

    read({
      commit,
      state
    }, id) {
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

    changeOrder({
      state,
      commit,
      dispatch
    }, by) {
      const orderIndex = state.order.findIndex(o => o.by === by);

      if (orderIndex === -1) {
        // order was not found: create it
        commit('ADD_ORDER', {
          by,
          direction: 'ASC'
        });
      } else {
        const foundOrder = state.order[orderIndex];
        const direction = foundOrder.direction === 'ASC' ? 'DESC' : 'ASC';
        commit('SET_ORDER', {
          orderIndex,
          direction
        });
      }

      dispatch('fetch');
    },

    fetch({
      commit,
      state
    }) {
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

      const queryString = qs.stringify(query, {
        encodeValuesOnly: true
      });
      const url = `${endpointUrl}?${queryString}`;
      return axios.get(url).then(res => {
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
        return res.data;
      }).catch(err => {
        console.error(err);
      });
    },

    updateField({
      commit,
      rootState
    }, {
      name,
      value
    }) {
      commit('UPDATE_FIELD', {
        name,
        value,
        rootState
      });
    },

    create({
      commit
    }, newObj) {
      newObj = newObj || {};
      hooks.create(newObj); // use hooks.create e.g. for setting defaults

      return axios.post(endpointUrl, newObj).then(res => {
        if (res.error) {
          console.error(res.error);
        } else {
          commit('ADD', res.data);
          return res.data;
        }
      }).catch(err => {
        console.error(err);
      });
    },

    deleteBatch({
      commit
    }, ids) {
      commit('DELETE_BATCH', ids);
      const url = `${endpointUrl}/batch-delete`;
      return axios.post(url, ids).then(result => {
        if (result.data.error) {
          throw new Error(result.data.error);
        }
      });
    },

    // on response replace existing record attributes
    patchBatch({
      dispatch
    }, list) {
      const url = `${endpointUrl}/batch-upsert`;
      return axios.post(url, list).then(result => {
        if (result.data.error) {
          throw new Error(result.data.error);
        }

        for (let i = 0, l = result.data.length; i < l; i++) {
          const resItem = result.data[i];
          dispatch('patch', {
            id: resItem.id,
            fields: resItem
          });
        }
      });
    },

    // list all items
    // on response clear all and add 
    // items from response
    upsertBatch({
      commit
    }, list) {
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
          } else {//console.warn('createdCell is', createdCell);
          }
        }

        return result.data;
      });
    },

    patch({
      commit
    }, {
      id,
      fields
    }) {
      if (!fields) {
        throw new Error('no patch fields');
      }

      commit('PATCH', {
        id,
        fields
      });
    },

    setScope({
      commit
    }, scope) {
      commit('SET_SCOPE', scope);
    },

    removeScope({
      commit
    }, key) {
      commit('REMOVE_SCOPE', key);
    },

    setIn({
      commit
    }, inData) {
      commit('SET_SCOPE', inData);
    }

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

    ADD_ORDER(state, {
      by,
      direction
    }) {
      // splice(insertAt 0, remove 0, object);
      state.order.splice(0, 0, {
        by,
        direction
      });
    },

    // changed order becomes primary order
    // i.e. will become first in order
    SET_ORDER(state, {
      orderIndex,
      direction
    }) {
      const keepOrder = state.order[orderIndex];
      keepOrder.direction = direction; // remove from old Position

      state.order.splice(orderIndex, 1);
      state.order.splice(0, 0, keepOrder);
    },

    CLEAR_ORDER(state) {
      state.order.splice(0);
    },

    CLEAR_LIST(state) {
      state.list.splice(0);
    },

    UPDATE_FIELD(state, {
      name,
      value,
      rootState
    }) {
      if (state.newArticle) {
        Vue.set(state.newArticle, name, value);
      } else {
        let article = state.list.find(t => {
          return t.id === rootState.route.params.id;
        });
        Vue.set(article, name, value);
      }
    },

    ADD(state, article) {
      state.list.push(article);
    },

    PATCH(state, {
      id,
      fields
    }) {
      if (!fields) {
        throw new Error('no fields for PATCH');
      }

      const index = state.list.findIndex(item => item[idName] === id);
      console.log('PATCH index', index);

      for (let key in fields) {
        console.log('PATCH key  ', key);
        console.log('PATCH value', fields[key]);
        Vue.set(state.list[index], key, fields[key]);
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
        for (let key in state.search) {
          Vue.delete(state.search, key);
        }

        Vue.delete(state, 'search');
      }
    },

    // inData 
    SET_IN(state, inData) {
      if (!state.in) {
        Vue.set(state, 'in', {});
      }

      for (let key in inData) {
        Vue.set(state.in, key, inData[key]);
      }
    },

    SET_SCOPE(state, scope) {
      if (!state.scope) {
        Vue.set(state, 'scope', {});
      }

      for (let key in scope) {
        Vue.set(state.scope, key, scope[key]);
      }
    },

    REMOVE_SCOPE(state, key) {
      if (!state.scope) {
        return false;
      }

      if (state.scope[key]) {
        Vue.delete(state.scope, key);
      }
    },

    DELETE(state, id) {
      const index = state.list.findIndex(t => t[idName] === id);
      state.list.splice(index, 1);
    }

  };
  hooks.state(newStore.state);
  return newStore;
};

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__2__;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__3__;

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__4__;

/***/ })
/******/ ]);
});