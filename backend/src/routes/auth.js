import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// регистрация
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone, roles, grade } = req.body;
    
    // проверяем, что такой юзер ещё не существует
    const existing = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existing) {
      return res.status(400).json({ 
        msg: 'Пользователь с таким email или username уже есть' 
      });
    }
    
    const user = new User({
      username,
      email,
      password,
      phone,
      roles,
      grade
    });
    
    await user.save();
    
    // создаем токен
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // не возвращаем пароль
    user.password = undefined;
    
    res.status(201).json({
      token,
      user
    });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ msg: 'Что-то сломалось при регистрации' });
  }
});

// логин
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // ищем юзера
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ msg: 'Неверные данные' });
    }
    
    // сверяем пароль
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ msg: 'Неверные данные' });
    }
    
    // создаем токен
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // не возвращаем пароль
    user.password = undefined;
    
    res.json({
      token,
      user
    });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ msg: 'Что-то сломалось при входе' });
  }
});

export default router; 