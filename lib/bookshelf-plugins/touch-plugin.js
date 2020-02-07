const log = require('mk-log');

module.exports = function touchPlugin(bookshelf) {

  async function touch(timeFieldName) {
    let touchFieldName = timeFieldName;
    if (!touchFieldName) {
      touchFieldName = 'updated_at';
    }
    //const isModel = this instanceof Model; 
    const tableName = this.tableName; 
    const updateQuery = `UPDATE ${tableName} SET ${touchFieldName } = CURRENT_TIMESTAMP(6) WHERE id = ${this.attributes.id}`; 

    const result = await bookshelf.knex.raw(updateQuery); 

    log.debug('raw result', result);

    return this.query(qb => {
      qb.where({id: this.attributes.id});
      qb.select(['id', touchFieldName]);
    }).fetch({require: false});
  
  }
  
  bookshelf.Model.touch = async function(...args) {
    await this.forge().touch(...args);
  };

  bookshelf.Model.prototype.touch = touch;

};
