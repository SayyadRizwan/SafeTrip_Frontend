const express = require('express');
const { Tourist } = require('../models/User');
const Alert = require('../models/Alert');
const GeoFence = require('../models/GeoFence');
const auth = require('../middleware/auth');
const router = express.Router();

// Update Tourist Location
router.post('/location', auth, async (req, res) => {
    try {
        const { lat, lng } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const tourist = await Tourist.findOne({ userId: req.user.userId });
        if (!tourist) {
            return res.status(404).json({
                success: false,
                message: 'Tourist profile not found'
            });
        }

        // Update location
        tourist.currentLocation = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            timestamp: new Date()
        };

        // Calculate safety score based on location
        tourist.safetyScore = await calculateSafetyScore(lat, lng);

        await tourist.save();

        res.json({
            success: true,
            message: 'Location updated successfully',
            data: {
                location: tourist.currentLocation,
                safetyScore: tourist.safetyScore
            }
        });

    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Safety Score
router.get('/safety-score', auth, async (req, res) => {
    try {
        const tourist = await Tourist.findOne({ userId: req.user.userId });
        if (!tourist) {
            return res.status(404).json({
                success: false,
                message: 'Tourist profile not found'
            });
        }

        res.json({
            success: true,
            data: {
                safetyScore: tourist.safetyScore,
                status: tourist.status,
                lastUpdated: tourist.currentLocation?.timestamp
            }
        });

    } catch (error) {
        console.error('Get safety score error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Toggle Location Sharing
router.post('/location-sharing', auth, async (req, res) => {
    try {
        const { enabled } = req.body;

        const tourist = await Tourist.findOne({ userId: req.user.userId });
        if (!tourist) {
            return res.status(404).json({
                success: false,
                message: 'Tourist profile not found'
            });
        }

        tourist.locationSharing = enabled;
        await tourist.save();

        res.json({
            success: true,
            message: `Location sharing ${enabled ? 'enabled' : 'disabled'}`,
            data: { locationSharing: tourist.locationSharing }
        });

    } catch (error) {
        console.error('Toggle location sharing error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Nearby Geo-fences
router.get('/nearby-geofences', auth, async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query; // Default 5km radius

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const geoFences = await GeoFence.find({
            isActive: true,
            center: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius)
                }
            }
        });

        res.json({
            success: true,
            data: geoFences
        });

    } catch (error) {
        console.error('Get nearby geo-fences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Tourist Alerts
router.get('/alerts', auth, async (req, res) => {
    try {
        const tourist = await Tourist.findOne({ userId: req.user.userId });
        if (!tourist) {
            return res.status(404).json({
                success: false,
                message: 'Tourist profile not found'
            });
        }

        const alerts = await Alert.find({ touristId: tourist._id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            data: alerts
        });

    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Calculate safety score based on location and other factors
async function calculateSafetyScore(lat, lng) {
    try {
        let score = 85; // Base score

        // Check nearby danger zones
        const dangerZones = await GeoFence.find({ 
            type: 'danger',
            isActive: true
        });

        for (const zone of dangerZones) {
            const distance = calculateDistance(lat, lng, zone.center.lat, zone.center.lng);
            if (distance <= zone.radius) {
                score -= 30; // In danger zone
            } else if (distance <= zone.radius * 2) {
                score -= 15; // Near danger zone
            }
        }

        // Check time of day (lower score during night)
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 5) {
            score -= 10; // Night time
        }

        // Check recent incidents in the area
        const recentAlerts = await Alert.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    },
                    $maxDistance: 1000 // 1km radius
                }
            },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
            type: { $in: ['incident', 'sos'] }
        });

        score -= recentAlerts.length * 5;

        // Ensure score is between 0 and 100
        return Math.max(0, Math.min(100, score));

    } catch (error) {
        console.error('Calculate safety score error:', error);
        return 85; // Return default score on error
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

module.exports = router;
