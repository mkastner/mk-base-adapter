exports.up = function(knex) {

  return Promise.all([
 
    knex.schema.createTable('persons', (t) => {
      t.increments('id').unsigned().primary(); 
      t.integer('parent_id');
      t.integer('job_id');
      t.timestamp('created_at', {precision: 6}).defaultTo(knex.fn.now(6));
      t.timestamp('updated_at', {precision: 6}).defaultTo(knex.fn.now(6));
      t.string('first_name');
      t.string('last_name');
    }),
    
    knex.schema.createTable('jobs', (t) => {
      t.increments('id').unsigned().primary(); 
      t.timestamp('created_at', {precision: 6}).defaultTo(knex.fn.now(6));
      t.timestamp('updated_at', {precision: 6}).defaultTo(knex.fn.now(6));
      t.string('title');
    }),
  ]);
};

exports.down = function(knex) {
  
  return Promise.all([

    knex.schema.dropTable('persons'),
    knex.schema.dropTable('jobs')
  ]); 
};
