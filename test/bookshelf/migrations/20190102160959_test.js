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

    knex.schema.createTable('images', (t) => {
      t.increments('id').unsigned().primary();
      t.string('name');
      t.timestamp('created_at', {precision: 6}).defaultTo(knex.fn.now(6));
      t.timestamp('updated_at', {precision: 6}).defaultTo(knex.fn.now(6));
      t.string('asset_file_name');
      t.string('asset_content_type');
      t.integer('asset_file_size').defaultTo(0);
      t.string('file_hash');
      t.string('dimensions');
      t.dateTime('asset_updated_at', {precision: 6}).defaultTo(knex.fn.now(6));
    }),
  ]);
};

exports.down = function(knex) {
  
  return Promise.all([

    knex.schema.dropTable('persons'),
    knex.schema.dropTable('jobs'),
    knex.schema.dropTable('images')
  ]); 
};
