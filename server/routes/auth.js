const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already in use' });
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashed });
        res.status(201).json({
            token: signToken(user._id),
            user: { id: user._id, username, email }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({
            token: signToken(user._id),
            user: { id: user._id, username: user.username, email }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;