const express = require('express');
const { User, Tourist, Authority } = require('../models/User');
const Alert = require('../models/Alert');
const GeoFence = require('../models/GeoFence');
const Incident = require('../models/Incident');
const auth = require('../middleware/auth');
const router = express.Router();

// Get Dashboard Statistics
router.get('/dashboard', auth, async (req, res) => {
    try {
        // Get active tourists count
        const activeTouristsCount = await Tourist.countDocuments({ status: 'active' });

        // Get active alerts count
        const activeAlertsCount = await Alert.countDocuments({ 
            status: { $in: ['active', 'acknowledged', 'responding'] }
        });

        // Get today's incidents count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIncidentsCount = await Incident.countDocuments({
            createdAt: { $gte: today }
        });

        // Get geo-fences count
        const geoFencesCount = await GeoFence.countDocuments({ isActive: true });

        // Get recent alerts
        const recentAlerts = await Alert.find()
            .populate('touristId', 'userId')
            .populate({
                path: 'touristId',
                populate: {
                    path: 'userId',
                    select: 'name phone'
                }
            })
            .sort({ createdAt: -1 })
            .limit(10);

        // Get tourist locations for heatmap
        const touristLocations = await Tourist.find({ 
            status: 'active',
            locationSharing: true,
            'currentLocation.lat': { $exists: true }
        }).populate('userId', 'name');

        res.json({
            success: true,
            data: {
                statistics: {
                    activeTourists: activeTouristsCount,
                    activeAlerts: activeAlertsCount,
                    todayIncidents: todayIncidentsCount,
                    geoFences: geoFencesCount
                },
                recentAlerts,
                touristLocations: touristLocations.map(tourist => ({
                    id: tourist._id,
                    name: tourist.userId?.name,
                    location: tourist.currentLocation,
                    safetyScore: tourist.safetyScore,
                    status: tourist.status
                }))
            }
        });

    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get All Tourists
router.get('/tourists', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;

        let query = {};
        if (status) query.status = status;

        const tourists = await Tourist.find(query)
            .populate('userId', 'name email phone')
            .sort({ updatedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Tourist.countDocuments(query);

        res.json({
            success: true,
            data: {
                tourists,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get tourists error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get All Alerts
router.get('/alerts', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, type } = req.query;

        let query = {};
        if (status) query.status = status;
        if (type) query.type = type;

        const alerts = await Alert.find(query)
            .populate('touristId')
            .populate({
                path: 'touristId',
                populate: {
                    path: 'userId',
                    select: 'name phone email'
                }
            })
            .populate('authorityId')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Alert.countDocuments(query);

        res.json({
            success: true,
            data: {
                alerts,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update Alert Status
router.put('/alerts/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const alertId = req.params.id;

        if (!['acknowledged', 'responding', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const authority = await Authority.findOne({ userId: req.user.userId });

        const alert = await Alert.findByIdAndUpdate(
            alertId,
            { 
                status,
                authorityId: authority._id,
                updatedAt: new Date()
            },
            { new: true }
        ).populate('touristId').populate('authorityId');

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        res.json({
            success: true,
            message: 'Alert status updated successfully',
            data: alert
        });

    } catch (error) {
        console.error('Update alert status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Create Geo-fence
router.post('/geofences', auth, async (req, res) => {
    try {
        const { name, description, type, center, radius, region } = req.body;

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
            center,
            radius,
            region,
            createdBy: authority._id
        });

        await geoFence.save();

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

// Get Geo-fences
router.get('/geofences', auth, async (req, res) => {
    try {
        const { page = 1, limit = 50, type, region } = req.query;

        let query = { isActive: true };
        if (type) query.type = type;
        if (region) query.region = region;

        const geoFences = await GeoFence.find(query)
            .populate('createdBy', 'officerID department')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await GeoFence.countDocuments(query);

        res.json({
            success: true,
            data: {
                geoFences,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get geo-fences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Analytics
router.get('/analytics', auth, async (req, res) => {
    try {
        const { period = '7d' } = req.query;

        let startDate = new Date();
        switch(period) {
            case '24h':
                startDate.setDate(startDate.getDate() - 1);
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        // Alerts by type
        const alertsByType = await Alert.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Alerts by status
        const alertsByStatus = await Alert.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Daily alert trends
        const dailyAlerts = await Alert.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Safety scores distribution
        const safetyScores = await Tourist.aggregate([
            {
                $bucket: {
                    groupBy: '$safetyScore',
                    boundaries: [0, 50, 70, 85, 101],
                    default: 'Other',
                    output: { count: { $sum: 1 } }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                alertsByType,
                alertsByStatus,
                dailyAlerts,
                safetyScores
            }
        });

    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
