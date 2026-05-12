const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const matches = await Match.find({
      users: req.user.id,
      isActive: true
    }).populate('users', 'name avatar');

    const result = matches.map(m => ({
      matchId: m._id,
      user: m.users.find(u => u._id.toString() !== req.user.id)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
