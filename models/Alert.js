const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['sos', 'geo-fence', 'incident', 'medical', 'security', 'weather']
    },
    touristId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tourist',
        required: true
    },
    authorityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Authority'
    },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String }
    },
    message: {
        type: String,
        required: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['active', 'acknowledged', 'responding', 'resolved', 'closed'],
        default: 'active'
    },
    responseTime: {
        type: Date
    },
    resolvedTime: {
        type: Date
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
alertSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Set response time when acknowledged
alertSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'acknowledged' && !this.responseTime) {
        this.responseTime = Date.now();
    }

    if (this.isModified('status') && this.status === 'resolved' && !this.resolvedTime) {
        this.resolvedTime = Date.now();
    }

    next();
});

module.exports = mongoose.model('Alert', alertSchema);
