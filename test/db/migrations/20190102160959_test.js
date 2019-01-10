exports.up = function(knex) {
  return knex.schema.createTable('test_items', (t) => {
    t.increments('id').unsigned().primary(); 
    t.integer('parent_id');
    t.dateTime('created_at');
    t.dateTime('updated_at');
    
    t.string('first_name');
    t.string('last_name');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('test_items'); 
};
