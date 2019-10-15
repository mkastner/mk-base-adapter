require('../db/database.js');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;
const schema = new Schema({
  persons: [{ type: Schema.Types.ObjectId, ref: 'TestItem' }],
  title: { type: String, required: [true, 'Title muß angegeben werden'] },
}, {timestamps: true});
schema.plugin(mongoosePaginate);
module.exports = mongoose.model('Job', schema);

