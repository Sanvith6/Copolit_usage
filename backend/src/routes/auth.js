const express = require('express');
const bcrypt = require('bcryptjs');
const { createUser, getUserByUsername } = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, displayName, password } = req.body;
  if (!username || !password || !displayName) return res.status(400).json({ error: 'Missing fields' });
  if (getUserByUsername(username)) return res.status(409).json({ error: 'Username taken' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({ username, displayName, passwordHash });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, avatar_color: user.avatar_color } });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, avatar_color: user.avatar_color } });
});

module.exports = router;
