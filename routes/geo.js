const express = require('express');
const GeoFence = require('../models/GeoFence');
const Alert = require('../models/Alert');
const { Tourist, Authority } = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Create Geo-fence
router.post('/fences', auth, async (req, res) => {
    try {
        const { name, description, type, center, radius, region } = req.body;

        // Only authorities can create geo-fences
        if (req.user.userType !== 'authority') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only authorities can create geo-fences.'
            });
        }

        if (!name || !type || !center || !radius || !region) {
            return res.status(400).json({
                success: false,
                message: 'Name, type, center coordinates, radius, and region are required'
            });
        }

        const authority = await Authority.findOne({ userId: req.user.userId });

        const geoFence = new GeoFence({
            name,
            description,
            type,
            center: {
                lat: parseFloat(center.lat),
                lng: parseFloat(center.lng)
            },
            radius: parseInt(radius),
            region,
            createdBy: authority._id
        });

        await geoFence.save();
        await geoFence.populate('createdBy', 'officerID department name');

        res.status(201).json({
            success: true,
            message: 'Geo-fence created successfully',
            data: geoFence
        });

    } catch (error) {
        console.error('Create geo-fence error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get All Geo-fences
router.get('/fences', auth, async (req, res) => {
    try {
        const { type, region, active = true } = req.query;

        let query = {};
        if (type) query.type = type;
        if (region) query.region = region;
        if (active !== undefined) query.isActive = active === 'true';

        const geoFences = await GeoFence.find(query)
            .populate('createdBy', 'officerID department')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: geoFences
        });

    } catch (error) {
        console.error('Get geo-fences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Geo-fence by ID
router.get('/fences/:id', auth, async (req, res) => {
    try {
        const geoFence = await GeoFence.findById(req.params.id)
            .populate('createdBy', 'officerID department name');

        if (!geoFence) {
            return res.status(404).json({
                success: false,
                message: 'Geo-fence not found'
            });
        }

        res.json({
            success: true,
            data: geoFence
        });

    } catch (error) {
        console.error('Get geo-fence by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update Geo-fence
router.put('/fences/:id', auth, async (req, res) => {
    try {
        // Only authorities can update geo-fences
        if (req.user.userType !== 'authority') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only authorities can update geo-fences.'
            });
        }

        const { name, description, type, center, radius, isActive } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (type) updateData.type = type;
        if (center) updateData.center = {
            lat: parseFloat(center.lat),
            lng: parseFloat(center.lng)
        };
        if (radius) updateData.radius = parseInt(radius);
        if (isActive !== undefined) updateData.isActive = isActive;

        updateData.updatedAt = new Date();

        const geoFence = await GeoFence.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('createdBy', 'officerID department name');

        if (!geoFence) {
            return res.status(404).json({
                success: false,
                message: 'Geo-fence not found'
            });
        }

        res.json({
            success: true,
            message: 'Geo-fence updated successfully',
            data: geoFence
        });

    } catch (error) {
        console.error('Update geo-fence error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Delete Geo-fence
router.delete('/fences/:id', auth, async (req, res) => {
    try {
        // Only authorities can delete geo-fences
        if (req.user.userType !== 'authority') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only authorities can delete geo-fences.'
            });
        }

        const geoFence = await GeoFence.findByIdAndDelete(req.params.id);

        if (!geoFence) {
            return res.status(404).json({
                success: false,
                message: 'Geo-fence not found'
            });
        }

        res.json({
            success: true,
            message: 'Geo-fence deleted successfully'
        });

    } catch (error) {
        console.error('Delete geo-fence error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Check Point in Geo-fences
router.post('/check-location', auth, async (req, res) => {
    try {
        const { lat, lng } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        // Find all active geo-fences
        const geoFences = await GeoFence.find({ isActive: true });

        const results = [];

        for (const fence of geoFences) {
            const distance = calculateDistance(
                latitude,
                longitude,
                fence.center.lat,
                fence.center.lng
            );

            if (distance <= fence.radius) {
                results.push({
                    geoFence: fence,
                    distance,
                    isInside: true
                });
            }
        }

        res.json({
            success: true,
            data: {
                location: { lat: latitude, lng: longitude },
                geoFences: results,
                isInDangerZone: results.some(r => r.geoFence.type === 'danger')
            }
        });

    } catch (error) {
        console.error('Check location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Nearby Geo-fences
router.get('/nearby', auth, async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const searchRadius = parseInt(radius);

        // Find all active geo-fences within radius
        const geoFences = await GeoFence.find({ isActive: true })
            .populate('createdBy', 'department');

        const nearbyFences = [];

        for (const fence of geoFences) {
            const distance = calculateDistance(
                latitude,
                longitude,
                fence.center.lat,
                fence.center.lng
            );

            if (distance <= searchRadius) {
                nearbyFences.push({
                    ...fence.toObject(),
                    distance
                });
            }
        }

        // Sort by distance
        nearbyFences.sort((a, b) => a.distance - b.distance);

        res.json({
            success: true,
            data: nearbyFences
        });

    } catch (error) {
        console.error('Get nearby geo-fences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Calculate distance between two coordinates in meters
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
