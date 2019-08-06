'use sctrict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  name: { type: String },
  areaProibida: { type: String },
  lineColor: { type: Date },
  type: { type: String },
  area: { type: { type: String },
            coordinates: { type: [ Array ]
        }
  }
}, { collection: 'ForbiddenArea'});

module.exports = mongoose.model('ForbiddenArea', schema);
