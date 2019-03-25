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
  // e.g. sort[first_name]=DESC&sort[last_name]=ASC
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

  if (name === 'scope' && query.scope ||
    name === 'search' && query.search ||
    name === 'sort' && query.sort) {

    for (let key in query[name]) {
      handler(key, query[name][key]); 
    }
  }

  if (name === 'date' && query.date) {
    // e.g date[created_at][gt]=2024-03-04 
    // on client
    //
    //const  latestClientUpdate = decodeURIComponent(req.query.modified);
    for (let fieldName in query.date) {
      const field = query[name][fieldName];
      let comp = '=';
      let dateStr = '';
      let decodedDate = '';
      // there's only one condition in field 
      
      for (let cond in field) {
        if (cond === 'gt') {
          comp = '>';
        } else if (cond === 'lt') {
          comp = '<';
        } else if (cond === 'gteq') {
          comp = '>='; 
        } else if (cond === 'lteq') {
          comp = '<='; 
        }
        dateStr = field[cond];
        decodedDate = decodeURIComponent(dateStr);

      } 
      handler(fieldName, comp, decodedDate); 
    }
  
  }

};
