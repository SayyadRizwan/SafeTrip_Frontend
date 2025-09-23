const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tourist',
        required: true
    },
    assignedOfficer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Authority'
    },
    type: {
        type: String,
        required: true,
        enum: ['theft', 'harassment', 'medical', 'accident', 'fraud', 'assault', 'lost', 'other']
    },
    title: {
        type: String,
        required: [true, 'Incident title is required'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Incident description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String }
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['filed', 'investigating', 'resolved', 'closed'],
        default: 'filed'
    },
    evidences: [{
        type: { type: String, enum: ['photo', 'video', 'audio', 'document'] },
        url: { type: String },
        description: { type: String }
    }],
    witnesses: [{
        name: { type: String },
        contact: { type: String },
        statement: { type: String }
    }],
    eFIRNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    filedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: {
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

// Generate e-FIR number before saving
incidentSchema.pre('save', function(next) {
    if (!this.eFIRNumber && this.status === 'filed') {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

        this.eFIRNumber = `EFIR${year}${month}${day}${random}`;
    }

    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Incident', incidentSchema);
