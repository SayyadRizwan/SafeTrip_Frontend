const express = require('express');
const Alert = require('../models/Alert');
const { Tourist } = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Create Alert
router.post('/', auth, async (req, res) => {
    try {
        const { type, message, description, location, severity } = req.body;

        if (!type || !message || !location) {
            return res.status(400).json({
                success: false,
                message: 'Type, message, and location are required'
            });
        }

        // Get tourist ID
        let touristId = null;
        if (req.user.userType === 'tourist') {
            const tourist = await Tourist.findOne({ userId: req.user.userId });
            touristId = tourist._id;
        }

        const alert = new Alert({
            type,
            touristId,
            message,
            description,
            location,
            severity: severity || 'medium'
        });

        await alert.save();

        // Populate tourist data
        await alert.populate('touristId');
        if (alert.touristId) {
            await alert.populate({
                path: 'touristId',
                populate: {
                    path: 'userId',
                    select: 'name phone email'
                }
            });
        }

        res.status(201).json({
            success: true,
            message: 'Alert created successfully',
            data: alert
        });

    } catch (error) {
        console.error('Create alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Alerts
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, type, status, severity } = req.query;

        let query = {};
        if (type) query.type = type;
        if (status) query.status = status;
        if (severity) query.severity = severity;

        // If tourist, only show their alerts
        if (req.user.userType === 'tourist') {
            const tourist = await Tourist.findOne({ userId: req.user.userId });
            query.touristId = tourist._id;
        }

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

// Get Alert by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id)
            .populate('touristId')
            .populate({
                path: 'touristId',
                populate: {
                    path: 'userId',
                    select: 'name phone email'
                }
            })
            .populate('authorityId');

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        // Check if tourist can access this alert
        if (req.user.userType === 'tourist') {
            const tourist = await Tourist.findOne({ userId: req.user.userId });
            if (alert.touristId._id.toString() !== tourist._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        res.json({
            success: true,
            data: alert
        });

    } catch (error) {
        console.error('Get alert by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update Alert Status
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const alertId = req.params.id;

        // Only authorities can update alert status
        if (req.user.userType !== 'authority') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only authorities can update alert status.'
            });
        }

        if (!['acknowledged', 'responding', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const alert = await Alert.findByIdAndUpdate(
            alertId,
            { status, updatedAt: new Date() },
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

// Delete Alert
router.delete('/:id', auth, async (req, res) => {
    try {
        const alertId = req.params.id;

        // Only authorities can delete alerts
        if (req.user.userType !== 'authority') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only authorities can delete alerts.'
            });
        }

        const alert = await Alert.findByIdAndDelete(alertId);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        res.json({
            success: true,
            message: 'Alert deleted successfully'
        });

    } catch (error) {
        console.error('Delete alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
