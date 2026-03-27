const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretjwt', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar, status: user.status } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretjwt', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar, status: user.status } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (typeof status !== 'string') {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const trimmedStatus = status.trim();
    if (trimmedStatus.length > 140) {
      return res.status(400).json({ message: 'Status must be 140 characters or less' });
    }
    const nextStatus = trimmedStatus || 'Hey there! I am using WhatsApp.';
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { status: nextStatus },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
