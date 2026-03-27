const express = require('express');
const { getMessages, getConversation } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/:conversationId', authenticateToken, (req, res) => {
  const conv = getConversation(req.params.conversationId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const participants = JSON.parse(conv.participants);
  if (!participants.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  const messages = getMessages(req.params.conversationId);
  res.json(messages);
});

module.exports = router;
