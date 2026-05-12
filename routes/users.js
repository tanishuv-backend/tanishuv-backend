const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/discover', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const seen = [...currentUser.likes, ...currentUser.dislikes, ...currentUser.matches, currentUser._id];
    
    const users = await User.find({
      _id: { $nin: seen },
      isActive: true,
      age: { $gte: 18, $lte: 50 }
    }).select('-password').limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/like/:id', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const likedUser = await User.findById(req.params.id);

    if (!likedUser) return res.status(404).json({ message: 'User not found' });

    currentUser.likes.push(req.params.id);
    await currentUser.save();

    const isMatch = likedUser.likes.includes(req.user.id);
    
    if (isMatch) {
      currentUser.matches.push(req.params.id);
      likedUser.matches.push(req.user.id);
      await currentUser.save();
      await likedUser.save();

      const Match = require('../models/Match');
      await Match.create({ users: [req.user.id, req.params.id] });

      return res.json({ isMatch: true, message: "It's a match!" });
    }

    res.json({ isMatch: false, message: 'Liked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/dislike/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.dislikes.push(req.params.id);
    await user.save();
    res.json({ message: 'Disliked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
