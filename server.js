require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// JWT tekshirish
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token yoq' });
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token notogri' });
  }
};

// ===== AUTH =====

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password, age, gender } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Barcha maydonlarni toldiring' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    
    const result = db.users.insert({
      name, email, password: hashed, age, gender
    });
    
    const token = jwt.sign(
      { id: result.lastInsertRowid, email, name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      success: true, 
      token, 
      user: { id: result.lastInsertRowid, name, email } 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu email allaqachon bor' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = db.users.getByEmail(email);
    
    if (!user) {
      return res.status(400).json({ error: 'Email yoki parol notogri' });
    }
    
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Email yoki parol notogri' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        bio: user.bio
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profil olish
app.get('/api/profile', auth, (req, res) => {
  try {
    const user = db.users.getById(req.user.id);
    
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profil yangilash
app.put('/api/profile', auth, (req, res) => {
  const { name, age, bio, photo } = req.body;
  
  try {
    db.users.update(req.user.id, { name, age, bio, photo });
    res.json({ success: true, message: 'Profil yangilandi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== FOYDALANUVCHILAR =====

// Barcha foydalanuvchilar
app.get('/api/users', auth, (req, res) => {
  try {
    const users = db.users.getAll(req.user.id);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== POSTLAR (MAVZULAR) =====

// Post yaratish
app.post('/api/posts', auth, (req, res) => {
  const { title, content, category } = req.body;
  
  try {
    const result = db.posts.insert({
      user_id: req.user.id,
      title,
      content,
      category: category || 'umumiy'
    });
    
    res.json({ success: true, post_id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Barcha postlar
app.get('/api/posts', (req, res) => {
  try {
    const posts = db.posts.getAll();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== XABARLAR (CHAT) =====

// Xabar yuborish
app.post('/api/messages', auth, (req, res) => {
  const { receiver_id, content } = req.body;
  
  try {
    const result = db.messages.insert({
      sender_id: req.user.id,
      receiver_id,
      content
    });
    
    res.json({ success: true, message_id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xabarlarni olish
app.get('/api/messages/:userId', auth, (req, res) => {
  const otherId = parseInt(req.params.userId);
  
  try {
    const messages = db.messages.getBetween(req.user.id, otherId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== LIKE (SEVGI) =====

// Like bosish
app.post('/api/like/:userId', auth, (req, res) => {
  const likedId = parseInt(req.params.userId);
  
  try {
    db.likes.insert(req.user.id, likedId);
    
    // Oqimli like tekshirish
    const match = db.likes.checkMatch(req.user.id, likedId);
    
    res.json({
      success: true,
      match: match,
      message: match ? '🎉 Oqimli like! Bir-biringizga aloqaga chiqdingiz!' : 'Like bosildi'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server ishga tushirish
app.listen(PORT, () => {
  console.log(`🚀 SevgiCity server ${PORT}-portda ishlamoqda`);
  console.log(`📱 http://localhost:${PORT}`);
});
