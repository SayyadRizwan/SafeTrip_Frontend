const express = require('express');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const { Tourist, Authority } = require('../models/User');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const router = express.Router();

// SOS Emergency Alert
router.post('/sos', auth, async (req, res) => {
    try {
        const { location, message, severity = 'critical' } = req.body;

        if (!location || !location.lat || !location.lng) {
            return res.status(400).json({
                success: false,
                message: 'Location coordinates are required for SOS'
            });
        }

        // Get tourist profile
        const tourist = await Tourist.findOne({ userId: req.user.userId })
            .populate('userId', 'name phone email');

        if (!tourist) {
            return res.status(404).json({
                success: false,
                message: 'Tourist profile not found'
            });
        }

        // Create SOS alert
        const sosAlert = new Alert({
            type: 'sos',
            touristId: tourist._id,
            location: {
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lng),
                address: location.address
            },
            message: message || `Emergency SOS from ${tourist.userId.name}`,
            severity,
            status: 'active'
        });

        await sosAlert.save();
        await sosAlert.populate('touristId');
        await sosAlert.populate({
            path: 'touristId',
            populate: {
                path: 'userId',
                select: 'name phone email'
            }
        });

        // Update tourist status to emergency
        tourist.status = 'emergency';
        await tourist.save();

        // Notify authorities (in real implementation, use SMS/Email/Push notifications)
        await notifyAuthorities(sosAlert);

        // Send emergency contacts notification
        await notifyEmergencyContacts(tourist, sosAlert);

        res.status(201).json({
            success: true,
            message: 'SOS alert sent successfully. Help is on the way!',
            data: {
                alert: sosAlert,
                alertId: sosAlert._id,
                timestamp: sosAlert.createdAt
            }
        });

    } catch (error) {
        console.error('SOS alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while sending SOS alert'
        });
    }
});

// Report Incident
router.post('/incident', auth, async (req, res) => {
    try {
        const { type, title, description, location, severity, witnesses, evidences } = req.body;

        if (!type || !title || !description || !location) {
            return res.status(400).json({
                success: false,
                message: 'Type, title, description, and location are required'
            });
        }

        // Get tourist profile
        const tourist = await Tourist.findOne({ userId: req.user.userId });

        if (!tourist) {
            return res.status(404).json({
                success: false,
                message: 'Tourist profile not found'
            });
        }

        // Create incident report
        const incident = new Incident({
            reporterId: tourist._id,
            type,
            title,
            description,
            location: {
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lng),
                address: location.address
            },
            severity: severity || 'medium',
            witnesses: witnesses || [],
            evidences: evidences || []
        });

        await incident.save();
        await incident.populate('reporterId');
        await incident.populate({
            path: 'reporterId',
            populate: {
                path: 'userId',
                select: 'name phone email'
            }
        });

        // Create corresponding alert
        const alert = new Alert({
            type: 'incident',
            touristId: tourist._id,
            location: incident.location,
            message: `Incident reported: ${title}`,
            description: description,
            severity: incident.severity,
            status: 'active'
        });

        await alert.save();

        // Assign to nearest available authority
        await assignToAuthority(incident);

        res.status(201).json({
            success: true,
            message: 'Incident reported successfully',
            data: {
                incident,
                alert,
                eFIRNumber: incident.eFIRNumber
            }
        });

    } catch (error) {
        console.error('Report incident error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while reporting incident'
        });
    }
});

// Get Emergency Contacts
router.get('/contacts', (req, res) => {
    try {
        const emergencyContacts = [
            {
                name: 'Police',
                number: '100',
                description: 'For immediate police assistance',
                type: 'emergency'
            },
            {
                name: 'Medical Emergency',
                number: '108',
                description: 'For medical emergencies and ambulance',
                type: 'medical'
            },
            {
                name: 'Fire Department',
                number: '101',
                description: 'For fire emergency services',
                type: 'fire'
            },
            {
                name: 'Tourist Helpline',
                number: '1363',
                description: '24x7 tourist assistance helpline',
                type: 'tourism'
            },
            {
                name: 'Women Helpline',
                number: '1091',
                description: 'For women in distress',
                type: 'women'
            },
            {
                name: 'Child Helpline',
                number: '1098',
                description: 'For child-related emergencies',
                type: 'child'
            }
        ];

        res.json({
            success: true,
            data: emergencyContacts
        });

    } catch (error) {
        console.error('Get emergency contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Safety Tips
router.get('/safety-tips', (req, res) => {
    try {
        const safetyTips = [
            {
                id: 1,
                title: 'Stay in Well-lit Areas',
                description: 'Avoid dark alleys and isolated places, especially during night time.',
                category: 'general',
                priority: 'high'
            },
            {
                id: 2,
                title: 'Keep Emergency Contacts Ready',
                description: 'Always have local emergency numbers and embassy contacts saved.',
                category: 'emergency',
                priority: 'high'
            },
            {
                id: 3,
                title: 'Inform Your Itinerary',
                description: 'Share your travel plans with family and local authorities.',
                category: 'planning',
                priority: 'medium'
            },
            {
                id: 4,
                title: 'Carry Identification',
                description: 'Always carry valid ID and keep copies in separate places.',
                category: 'documents',
                priority: 'high'
            },
            {
                id: 5,
                title: 'Use Authorized Transport',
                description: 'Prefer licensed taxis and avoid hitchhiking.',
                category: 'transport',
                priority: 'medium'
            },
            {
                id: 6,
                title: 'Trust Your Instincts',
                description: 'If something feels wrong, remove yourself from the situation.',
                category: 'general',
                priority: 'high'
            },
            {
                id: 7,
                title: 'Keep Cash in Multiple Places',
                description: 'Don\'t keep all money in one place. Use multiple pockets.',
                category: 'money',
                priority: 'medium'
            },
            {
                id: 8,
                title: 'Learn Basic Local Phrases',
                description: 'Know how to ask for help in the local language.',
                category: 'communication',
                priority: 'low'
            }
        ];

        res.json({
            success: true,
            data: safetyTips
        });

    } catch (error) {
        console.error('Get safety tips error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update SOS Status (for authorities)
router.put('/sos/:id/status', auth, async (req, res) => {
    try {
        // Only authorities can update SOS status
        if (req.user.userType !== 'authority') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only authorities can update SOS status.'
            });
        }

        const { status, responseNotes } = req.body;
        const sosId = req.params.id;

        if (!['acknowledged', 'responding', 'resolved'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const authority = await Authority.findOne({ userId: req.user.userId });

        const sosAlert = await Alert.findOne({ _id: sosId, type: 'sos' });
        if (!sosAlert) {
            return res.status(404).json({
                success: false,
                message: 'SOS alert not found'
            });
        }

        sosAlert.status = status;
        sosAlert.authorityId = authority._id;
        if (responseNotes) {
            sosAlert.description = responseNotes;
        }

        await sosAlert.save();

        // If resolved, update tourist status back to active
        if (status === 'resolved') {
            await Tourist.findByIdAndUpdate(sosAlert.touristId, {
                status: 'active'
            });
        }

        res.json({
            success: true,
            message: `SOS alert ${status} successfully`,
            data: sosAlert
        });

    } catch (error) {
        console.error('Update SOS status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Helper function to notify authorities
async function notifyAuthorities(sosAlert) {
    try {
        // In real implementation, send SMS/Push notifications to nearby authorities
        console.log('Notifying authorities about SOS:', {
            alertId: sosAlert._id,
            location: sosAlert.location,
            tourist: sosAlert.touristId.userId.name
        });

        // Find authorities in the jurisdiction (simplified)
        const authorities = await Authority.find({ isOnDuty: true });

        // In production, use proper notification service
        // await sendSMSNotification(authorities, sosAlert);
        // await sendPushNotification(authorities, sosAlert);

    } catch (error) {
        console.error('Notify authorities error:', error);
    }
}

// Helper function to notify emergency contacts
async function notifyEmergencyContacts(tourist, sosAlert) {
    try {
        // In real implementation, send SMS/Email to emergency contacts
        console.log('Notifying emergency contacts:', {
            tourist: tourist.userId.name,
            emergencyContact: tourist.emergencyContact,
            location: sosAlert.location
        });

        // Create email transporter (if configured)
        if (process.env.EMAIL_HOST) {
            const transporter = nodemailer.createTransporter({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: tourist.userId.email,
                subject: 'SafeTrip Emergency Alert - SOS Activated',
                html: `
                    <h2>Emergency SOS Alert</h2>
                    <p>An SOS alert has been activated for ${tourist.userId.name}.</p>
                    <p><strong>Location:</strong> ${sosAlert.location.lat}, ${sosAlert.location.lng}</p>
                    <p><strong>Time:</strong> ${sosAlert.createdAt}</p>
                    <p><strong>Status:</strong> Help is on the way</p>
                    <p>Authorities have been notified and will respond promptly.</p>
                `
            };

            await transporter.sendMail(mailOptions);
        }

    } catch (error) {
        console.error('Notify emergency contacts error:', error);
    }
}

// Helper function to assign incident to authority
async function assignToAuthority(incident) {
    try {
        // Find available authorities (simplified assignment logic)
        const availableAuthorities = await Authority.find({ 
            isOnDuty: true,
            department: { $in: ['Police Department', 'Tourism Department'] }
        });

        if (availableAuthorities.length > 0) {
            // Assign to first available authority (in production, use better logic)
            incident.assignedOfficer = availableAuthorities[0]._id;
            await incident.save();
        }

    } catch (error) {
        console.error('Assign to authority error:', error);
    }
}

module.exports = router;
