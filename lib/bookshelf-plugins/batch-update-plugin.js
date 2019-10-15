const log = require('mk-log');

// on order for batchUpdate to work
// all objects must have same keys
function sanitizeAttributes(list) {

  const collectItem = {};

  // find all keys by looping through
  // all objects
  for (let i = 0, l = list.length; i < l; i++) {
    const listItem = list[i];
    for (let key in listItem) {
      if (!(key in collectItem)) {
        // ignore created_* because
        // because that's a special case
        collectItem[key] = null;
      }
    }
  }

  if (!('created_at' in collectItem)) {
    collectItem.created_at = null;
  }
  
  if (!('updated_at' in collectItem)) {
    collectItem.updated_at = null;
  }

  // put missing keys into objects 
  for (let i = 0, l = list.length; i < l; i++) {
    for (let key in collectItem) {
      if (!(key in list[i])) {
        list[i][key] = null;
      }
    }
  }


  return list;

}

module.exports = function batchUpdatePlugin(bookshelf) {

  // insert code from'),
  /// https://stackoverflow.com/questions/49707548/bulk-insert-update-mysql

  const Model = bookshelf.Model; 

  async function batchUpdate(list) {
    const isModel = this instanceof Model; 
    // const targetModel = isModel ? this.constructor : this.target || this.model;

    list = sanitizeAttributes(list);
    // get field names from first recorad

    // const timestamp = this.timestamp();

    const firstItem = list[0];
    const fieldNames = Object.keys(firstItem);


    let updateQuery = `INSERT INTO ${this.tableName} (${fieldNames.join(',')})`;
    updateQuery += ' VALUES ';
    const insertValues = [];
    for (let i = 0, il = list.length; i < il; i++) {
      const listItem = list[i];
      log.debug(`listItem ${i}`, listItem); 
      //const itemKeys = Object.keys(listItem);
      //log.info('itemKeys count', itemKeys.length); 
      const values = [];
      for (let j = 0, jl = fieldNames.length; j < jl; j++) {
        let key = fieldNames[j];
        //fieldNames.push(key);
        log.debug('key', key); 
        if (key.match(/^updated_|^created_/)) {
          values.push('CURRENT_TIMESTAMP(6)'); 
        } else {
          values.push('?');
        }
      }
      insertValues.push(`(${values.join(',')})\n`); 
    }
    updateQuery += `${insertValues.join(',')}`;
   
    //log.info('updateQuery', updateQuery);

    // UPDATE SECTION


    updateQuery += 'ON DUPLICATE KEY UPDATE\n';
    
    const updateFields = [];
    
    //log.info('fieldNames', fieldNames);
    //log.info('updateQuery ***********************************\n', updateQuery);

    for (let i = 0, l = fieldNames.length; i < l; i++) {
      const fieldName = fieldNames[i];
      if (!fieldName.match(/^created_|^id$/)) {
        if (fieldName.match(/^updated_/)) {
          updateFields.push(`${fieldName} = CURRENT_TIMESTAMP(6)`); 
        }
        else {
          updateFields.push(`${fieldName} = VALUES(${fieldName})`); 
        }
      } 
    }
    
    updateQuery += ` ${updateFields.join(', ')}\n`;
    
    const values = [];
    
    for (let i = 0, l = list.length; i < l; i++) {
      let listItem = list[i];
      //let keys = Object.keys(listItem); 
      for (let j = 0, jl = fieldNames.length; j < jl; j++) {
        const key = fieldNames[j];
        if (!key.match(/^created_|^updated_/)) {
          values.push(listItem[key]); 
        }
      }
    }
   
    log.debug('updateQuery \n', updateQuery);
    log.debug('values     ', values);

    try {

      //log.info('updateQuery', updateQuery);
      const rawCreatedResult = await bookshelf.knex.raw(updateQuery, values); 
      
      return rawCreatedResult;

    } catch (err) {
      log.error(err);
    }

  }

  bookshelf.Model.prototype.batchUpdate = batchUpdate;

  bookshelf.Model.batchUpdate = function(...args) {
    return this.forge().batchUpdate(...args);
  };

  bookshelf.Collection.prototype.batchUpdate = batchUpdate;

};
