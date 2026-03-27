const router = require('express').Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

router.post('/', auth, async (req, res) => {
  try {
    const { recipientId } = req.body;
    let chat = await Chat.findOne({ participants: { $all: [req.user.id, recipientId] } });
    if (!chat) {
      chat = new Chat({ participants: [req.user.id, recipientId] });
      await chat.save();
    }
    await chat.populate('participants', '-password');
    await chat.populate({ path: 'lastMessage', populate: { path: 'sender', select: '-password' } });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate('participants', '-password')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: '-password' } })
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
