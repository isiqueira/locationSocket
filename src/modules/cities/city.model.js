'use strict';

import mongoose from 'mongoose';
const { Schema } = mongoose;

const citySchema = new Schema({
  name: { type: String, required: true },
  state: { type: String, required: true, index: true },
  externalId: { type: String, required: true, unique: true },
  geometry: {
    type: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Array],
      required: true
    }
  }
}, { collection: 'Cities' });

citySchema.index({ geometry: '2dsphere' });

export default mongoose.model('Cities', citySchema);
