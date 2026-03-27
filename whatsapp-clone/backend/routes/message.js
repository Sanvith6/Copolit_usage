const router = require('express').Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

router.post('/', auth, async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const message = new Message({ chat: chatId, sender: req.user.id, content, readBy: [req.user.id] });
    await message.save();
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, updatedAt: Date.now() });
    await message.populate('sender', '-password');
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:chatId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', '-password')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
