const log = require('mk-log');

// http://localhost:3030/test?in[id]=2&in[id]=3&search[name]=mike&search[name]=gabi&sort[name]=desc


module.exports = function queryValues(query, name, handler) {

  // e.g. search[first_name]=mike&search[last_name]=gabi
  // => qb.where('first_name', 'LIKE', 'mike');
  //    qb.where('last_name', 'LIKE', 'gabi');
  // e.g. in[id]=1&in[id]=2
  // => qb.whereIn('id', [1,2])
  // e.g. in[id]=1&in[id]=2
  // => qb.whereIn('id', [1,2])
  // e.g. order[first_name]=DESC&sort[last_name]=ASC
  // => qb.orderBy('id', [1,2])
  // e.g. scope[active]=1&scope[parent_id]=1
  // => qb.orderBy('id', [1,2])
  if (!query[name]) return false;
  
  // there could be multiple in like
  // in[id]=1&in[name]=Mike
  if (name === 'in' && query.in) {
    for (let key in query.in) {
      handler(key, query.in[key]); 
    }
  }

  if (name === 'scope' && query.scope) { 

    for (let key in query['scope']) {
      const val = query['scope'][key];
      if (val) {
        handler(key, val); 
      }
    }
  }
 
  /*
  if (name === 'search' && query.search) {
    const raw = [];
    const args = [];
    for (let key in query['search']) {
      const val = query['search'][key];
      if (val) {
        raw.push(`upper(${key}) LIKE ?`);
        args.push(`%${val.toUpperCase()}%`); 
      }
    }
    if (raw.length && args.length) {
      const braced = `(${raw.join(' OR ')})`; 
      handler(braced, args);
    }
  }
  */
  if (name === 'search' && query.search) {
    const keys = [];
    const values = [];
    for (let key in query['search']) {
      const val = query['search'][key];
      if (val) {
        keys.push(key);
        values.push(val); 
      }
    }
    if (keys.length && values.length) {
      //const braced = `(${raw.join(' OR ')})`; 
      handler(keys, values);
    }
  }
  
  if (name === 'order' && query.order) {
    log.debug('query.order', query.order);
    for (let i = 0, l = query.order.length; i < l; i++) { 
      const orderItem = query.order[i];
      handler(orderItem.by, orderItem.direction); 
    }
  }

  if (name === 'range' && query.range) {
    // e.g range[0][type]=date&range[0][field]=created_at&range[0][comp][gt]&range[0][value]=2024-03-04 
    // on client
    
    // range.type: optional

    for (let i = 0, l = query.range.length; i < l; i++) {
      const rangeItem = query.range[i];
      const field = rangeItem.field;
      const comp = rangeItem.comp;
      const val = rangeItem.val;
      const type = rangeItem.type; // type optional
      const decodedVal = decodeURIComponent(val);

      log.debug('decodedVal', decodedVal);

      log.debug('field', field);
      log.debug('comp ', comp);
      log.debug('val  ', decodedVal);
      log.debug('type  ', type);

      handler(field, comp, decodedVal, type); 
    }
  
  }

};
