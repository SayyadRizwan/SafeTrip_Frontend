const mongoose = require('mongoose');

const geoFenceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Geo-fence name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    type: {
        type: String,
        required: true,
        enum: ['safe', 'caution', 'danger', 'restricted']
    },
    center: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    radius: {
        type: Number,
        required: true,
        min: [10, 'Radius must be at least 10 meters'],
        max: [10000, 'Radius cannot exceed 10km']
    },
    color: {
        type: String,
        default: function() {
            switch(this.type) {
                case 'safe': return '#059669';
                case 'caution': return '#ea580c';
                case 'danger': return '#dc2626';
                case 'restricted': return '#7c3aed';
                default: return '#6b7280';
            }
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Authority',
        required: true
    },
    region: {
        type: String,
        required: true
    },
    alertsCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
geoFenceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for geospatial queries
geoFenceSchema.index({ "center": "2dsphere" });

module.exports = mongoose.model('GeoFence', geoFenceSchema);
