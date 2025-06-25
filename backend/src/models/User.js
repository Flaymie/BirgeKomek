import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Имя пользователя обязательно'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    lowercase: true,
    match: [/^[a-zA-Z0-9_]+$/, 'Имя пользователя может содержать только латинские буквы, цифры и подчеркивания'],
  },
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Введите корректный email'],
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен быть не менее 6 символов']
  },
  phone: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  },
  roles: {
    student: {
      type: Boolean,
      default: true
    },
    helper: {
      type: Boolean,
      default: false
    },
    moderator: {
      type: Boolean,
      default: false
    },
    admin: {
      type: Boolean,
      default: false
    }
  },
  banDetails: {
    isBanned: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null, // null означает перманентный бан
    },
  },
  grade: {
    type: Number,
    required: function() { return this.roles.student; },
    min: [7, 'Класс не может быть меньше 7'],
    max: [11, 'Класс не может быть больше 11']
  },
  rating: {
    type: Number,
    default: 5.0
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  subjects: {
    type: [String],
    default: []
  },
  avatar: {
    type: String,
    default: ''
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// хеширование пароля перед сохранением
userSchema.pre('save', async function(next) {
  // если пароль не изменен - пропускаем
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// метод сравнения пароля
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error(err);
  }
};

const User = mongoose.model('User', userSchema);

export default User; 