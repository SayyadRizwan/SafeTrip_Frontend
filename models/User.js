const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please provide a valid email'
        }
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function(phone) {
                return /^\+91[6-9]\d{9}$/.test(phone);
            },
            message: 'Please provide a valid Indian phone number'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    userType: {
        type: String,
        enum: ['tourist', 'authority'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
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

// Tourist-specific fields
const touristSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    emergencyContact: {
        type: String,
        required: [true, 'Emergency contact is required']
    },
    idType: {
        type: String,
        enum: ['aadhaar', 'passport', 'driving_license'],
        required: true
    },
    idNumber: {
        type: String,
        required: [true, 'ID number is required']
    },
    nationality: {
        type: String,
        required: true,
        default: 'Indian'
    },
    currentLocation: {
        lat: { type: Number },
        lng: { type: Number },
        timestamp: { type: Date, default: Date.now }
    },
    safetyScore: {
        type: Number,
        default: 85,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['active', 'alert', 'emergency', 'offline'],
        default: 'active'
    },
    visitDuration: {
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date }
    },
    locationSharing: {
        type: Boolean,
        default: false
    }
});

// Authority-specific fields
const authoritySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    officerID: {
        type: String,
        required: [true, 'Officer ID is required'],
        unique: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: ['Police Department', 'Tourism Department', 'Emergency Services', 'Medical Department']
    },
    rank: {
        type: String,
        default: 'Officer'
    },
    jurisdiction: {
        type: String,
        required: true
    },
    isOnDuty: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Update timestamp on save
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
const Tourist = mongoose.model('Tourist', touristSchema);
const Authority = mongoose.model('Authority', authoritySchema);

module.exports = { User, Tourist, Authority };
