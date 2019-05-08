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
      handler(raw.join(' OR '), args);
    }
  }


  if (name === 'order' && query.order) {
    log.info('query.order', query.order);
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
      let   comp = '=';
      // optional 
      //const type = query.type;
      const val = rangeItem.val;
      // there's only one condition in field 

      if (rangeItem.comp === 'gt') {
        comp = '>';
      } else if (rangeItem.comp === 'lt') {
        comp = '<';
      } else if (rangeItem.comp === 'gteq') {
        comp = '>='; 
      } else if (rangeItem.comp === 'lteq') {
        comp = '<='; 
      }
      //dateStr = field[cond];
      const decodedVal = decodeURIComponent(val);

      log.info('decodedVal', decodedVal);

      log.info('field', field);
      log.info('comp ', comp);
      log.info('val  ', decodedVal);

      handler(field, comp, decodedVal); 
    }
  
  }

};
