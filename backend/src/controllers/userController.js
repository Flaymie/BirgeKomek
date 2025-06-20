import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Генерация токена
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Регистрация пользователя
export const registerUser = async (req, res) => {
    // uploadAvatar middleware уже отработал здесь, если был передан файл
    const { username, email, password, role } = req.body;

    try {
        if (!username || !email || !password) {
            return res.status(400).json({ msg: 'Пожалуйста, заполните все обязательные поля' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ msg: 'Пользователь с таким email уже существует' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'client',
        });
        
        // Если был загружен аватар, сохраняем путь
        if (req.file) {
            // Заменяем обратные слэши (для Windows) на прямые
            newUser.avatar = `/${req.file.path.replace(/\\/g, '/')}`;
        }

        const savedUser = await newUser.save();

        const token = generateToken(savedUser._id);

        res.status(201).json({
            token,
            user: {
                _id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
                role: savedUser.role,
                avatar: savedUser.avatar
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Ошибка сервера при регистрации' });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                online: user.online,
                lastSeen: user.lastSeen,
                createdAt: user.createdAt
            });
        } else {
            res.status(404).json({ msg: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
};

export const updateUserProfile = async (req, res) => {
// ... existing code ...
} 