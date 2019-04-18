exports.up = function(knex) {
  return knex.schema.createTable('test_items', (t) => {
    t.increments('id').unsigned().primary(); 
    t.integer('parent_id');
    t.timestamp('created_at', {precision: 6}).defaultTo(knex.fn.now(6));
    t.timestamp('updated_at', {precision: 6}).defaultTo(knex.fn.now(6));
    
    t.string('first_name');
    t.string('last_name');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('test_items'); 
};
