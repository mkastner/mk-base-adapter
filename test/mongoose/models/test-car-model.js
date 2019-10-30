require('../db/database.js');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;
const schema = new Schema({
  person: { type: Schema.Types.ObjectId, ref: 'Person' },
  make: { type: String, enum: ['BMW', 'Mercedes', 'VW', 'Audi'] },
}, {timestamps: true});
schema.plugin(mongoosePaginate);
module.exports = mongoose.model('Car', schema);
