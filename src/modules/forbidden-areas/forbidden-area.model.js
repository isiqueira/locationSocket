'use strict';

import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema({
  name: { type: String },
  areaProibida: { type: String },
  lineColor: { type: String },
  type: { type: String },
  area: {
    type: { type: String, default: 'Polygon' },
    coordinates: { type: [Array] }
  }
}, { collection: 'ForbiddenArea' });

schema.index({ area: '2dsphere' });

export default mongoose.model('ForbiddenArea', schema);
