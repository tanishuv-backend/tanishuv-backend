const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Match = require('../models/Match');
const auth = require('../middleware/auth');

router.get('/:matchId', auth, async (req, res) => {
  try {
    const match = await Match.findOne({ _id: req.params.matchId, users: req.user.id });
    if (!match) return res.status(403).json({ message: 'Not authorized' });

    const messages = await Message.find({ match: req.params.matchId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:matchId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const match = await Match.findOne({ _id: req.params.matchId, users: req.user.id });
    if (!match) return res.status(403).json({ message: 'Not authorized' });

    const receiver = match.users.find(u => u.toString() !== req.user.id);
    const message = new Message({
      match: req.params.matchId,
      sender: req.user.id,
      receiver,
      content
    });

    await message.save();
    await message.populate('sender', 'name avatar');
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
