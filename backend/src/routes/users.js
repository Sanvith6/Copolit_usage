const express = require('express');
const { getAllUsers, getUserById } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const users = getAllUsers().filter(u => u.id !== req.user.id);
  res.json(users);
});

router.get('/:id', authenticateToken, (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

module.exports = router;
