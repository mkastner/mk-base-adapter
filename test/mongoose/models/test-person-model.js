require('../db/database.js');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;
const schema = new Schema({
  parent: { type: Schema.Types.ObjectId, ref: 'Person' },
  cars: [{ type: Schema.Types.ObjectId, ref: 'Car' }],
  job: { type: Schema.Types.ObjectId, ref: 'Job' },
  firstName: { type: String, required: [true, 'Vorname muß angegeben werden'] },
  lastName: { type: String, required: [true, 'Nachname muß angegeben werden'] }
}, {timestamps: true});
schema.plugin(mongoosePaginate);
module.exports = mongoose.model('TestItem', schema);
