'use strict';

import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
    {
        slug: { type: String },
        name: { type: String },
        gpsLocation: {
            type: { type: String },
            coordinates: { type: [Number] }
        },
        address: { type: String },
        checkedColor: { type: String },
        isActive: { type: Boolean },
        isFixedLocation: { type: Boolean }
    },
    { collection: 'Checkpoints' }
);

schema.index({ gpsLocation: '2dsphere' });

export default mongoose.model('Checkpoints', schema);
