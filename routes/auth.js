const express = require('express');
const jwt = require('jsonwebtoken');
const { User, Tourist, Authority } = require('../models/User');
const router = express.Router();

// Register Tourist
router.post('/register/tourist', async (req, res) => {
    try {
        const { name, email, phone, password, emergencyContact, idType, idNumber, nationality } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !password || !emergencyContact || !idType || !idNumber) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create user
        const user = new User({
            name,
            email,
            phone,
            password,
            userType: 'tourist'
        });

        await user.save();

        // Create tourist profile
        const tourist = new Tourist({
            userId: user._id,
            emergencyContact,
            idType,
            idNumber,
            nationality: nationality || 'Indian'
        });

        await tourist.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, userType: 'tourist' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(201).json({
            success: true,
            message: 'Tourist registered successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    userType: user.userType
                },
                tourist,
                token
            }
        });

    } catch (error) {
        console.error('Tourist registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Register Authority
router.post('/register/authority', async (req, res) => {
    try {
        const { name, email, phone, password, officerID, department, rank, jurisdiction } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !password || !officerID || !department || !jurisdiction) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Check if officer ID already exists
        const existingAuthority = await Authority.findOne({ officerID });
        if (existingAuthority) {
            return res.status(409).json({
                success: false,
                message: 'Officer ID already exists'
            });
        }

        // Create user
        const user = new User({
            name,
            email,
            phone,
            password,
            userType: 'authority'
        });

        await user.save();

        // Create authority profile
        const authority = new Authority({
            userId: user._id,
            officerID,
            department,
            rank: rank || 'Officer',
            jurisdiction
        });

        await authority.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, userType: 'authority' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(201).json({
            success: true,
            message: 'Authority registered successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    userType: user.userType
                },
                authority,
                token
            }
        });

    } catch (error) {
        console.error('Authority registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;

        // Validate input
        if (!email || !password || !userType) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, and user type are required'
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email, userType }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Get user profile based on type
        let userProfile = null;
        if (userType === 'tourist') {
            userProfile = await Tourist.findOne({ userId: user._id });
        } else if (userType === 'authority') {
            userProfile = await Authority.findOne({ userId: user._id });
            // Update last login
            userProfile.lastLogin = new Date();
            await userProfile.save();
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    userType: user.userType
                },
                profile: userProfile,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Get Profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user profile
        let userProfile = null;
        if (user.userType === 'tourist') {
            userProfile = await Tourist.findOne({ userId: user._id });
        } else if (user.userType === 'authority') {
            userProfile = await Authority.findOne({ userId: user._id });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    userType: user.userType
                },
                profile: userProfile
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
