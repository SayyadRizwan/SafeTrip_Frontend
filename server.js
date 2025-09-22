const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safetrip', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Import Routes
const authRoutes = require('./routes/auth');
const touristRoutes = require('./routes/tourist');
const authorityRoutes = require('./routes/authority');
const alertRoutes = require('./routes/alerts');
const geoRoutes = require('./routes/geo');
const emergencyRoutes = require('./routes/emergency');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tourist', touristRoutes);
app.use('/api/authority', authorityRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/emergency', emergencyRoutes);

// Socket.IO for real-time communication
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room based on user type
    socket.on('join', (data) => {
        const { userType, userId } = data;
        socket.join(`${userType}_${userId}`);
        console.log(`User ${userId} joined ${userType} room`);
    });

    // Handle SOS alerts
    socket.on('sos_alert', (data) => {
        console.log('SOS Alert received:', data);
        // Broadcast to all authorities
        io.to('authorities').emit('sos_alert', data);

        // Store alert in database
        const Alert = require('./models/Alert');
        const newAlert = new Alert({
            type: 'sos',
            touristId: data.touristId,
            location: data.location,
            message: 'Emergency SOS activated',
            timestamp: new Date(),
            status: 'active'
        });
        newAlert.save();
    });

    // Handle location updates
    socket.on('location_update', (data) => {
        // Update tourist location in real-time
        io.to('authorities').emit('location_update', data);

        // Check geo-fencing
        checkGeoFencing(data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Geo-fencing check function
async function checkGeoFencing(locationData) {
    const GeoFence = require('./models/GeoFence');
    const Alert = require('./models/Alert');

    try {
        const geoFences = await GeoFence.find({ type: 'danger' });

        for (const fence of geoFences) {
            const distance = calculateDistance(
                locationData.location.lat,
                locationData.location.lng,
                fence.center.lat,
                fence.center.lng
            );

            if (distance <= fence.radius) {
                // Tourist entered danger zone
                const alert = new Alert({
                    type: 'geo-fence',
                    touristId: locationData.touristId,
                    location: locationData.location,
                    message: `Tourist entered danger zone: ${fence.name}`,
                    timestamp: new Date(),
                    status: 'active'
                });

                await alert.save();

                // Send real-time alert
                io.to('authorities').emit('geo_fence_alert', {
                    alert,
                    fence: fence.name
                });

                io.to(`tourist_${locationData.touristId}`).emit('geo_fence_warning', {
                    message: `Warning: You are entering ${fence.name}`,
                    fence
                });
            }
        }
    } catch (error) {
        console.error('Geo-fencing check error:', error);
    }
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`SafeTrip Server running on port ${PORT}`);
});
