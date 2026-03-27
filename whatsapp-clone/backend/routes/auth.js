const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

router.get('/users', require('../middleware/auth'), async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
