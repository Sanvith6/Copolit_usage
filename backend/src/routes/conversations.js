const express = require('express');
const { getOrCreateConversation, getUserConversations, getUserById } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const convs = getUserConversations(req.user.id);
  const result = convs.map(c => {
    const participants = JSON.parse(c.participants);
    const otherId = participants.find(p => p !== req.user.id);
    const other = getUserById(otherId);
    return { ...c, other };
  });
  res.json(result);
});

router.post('/', authenticateToken, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const conv = getOrCreateConversation(req.user.id, userId);
  const other = getUserById(userId);
  res.json({ ...conv, other });
});

module.exports = router;
