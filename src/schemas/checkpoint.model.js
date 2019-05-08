'use sctrict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
    {
        slug: { type: 'String' },
        name: { type: 'String' },
        gpsLocation: { 
            type: { type: 'String' },
            coordinates: { type: [ 'Number' ] }
        },
        address: { type: 'String' },
        checkedColor: { type: 'String' },
        isActive: { type: 'Boolean' },
        isFixedLocation: { type: 'Boolean' }
    } , { collection: 'Checkpoints' }
);

schema.index({ gpsLocation: "2dsphere" });

module.exports = mongoose.model('Checkpoints', schema);
