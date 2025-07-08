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
  password: {
    type: String,
    minlength: [6, 'Пароль должен быть не менее 6 символов'],
    select: false
  },
  hasPassword: {
    type: Boolean,
    default: false
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
  telegramId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  telegramUsername: {
    type: String,
    trim: true
  },
  telegramNotificationsEnabled: {
    type: Boolean,
    default: true
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
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    min: [7, 'Класс не может быть меньше 7'],
    max: [11, 'Класс не может быть больше 11'],
    default: null
  },
  rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5
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
  },
  lastUsernameChange: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true,
  // --- ВАЖНО: Настройки для виртуальных полей ---
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- ВИРТУАЛЬНЫЕ ПОЛЯ ---

// Количество созданных заявок
userSchema.virtual('createdRequests', {
  ref: 'Request', // Модель, которую считаем
  localField: '_id', // Поле в User
  foreignField: 'author', // Поле в Request, которое ссылается на User
  count: true // Просто посчитать количество, а не загружать документы
});

// Количество выполненных заявок (как хелпер)
userSchema.virtual('completedRequests', {
  ref: 'Request',
  localField: '_id',
  foreignField: 'helper',
  count: true,
  match: { status: 'completed' }
});


// хеширование пароля перед сохранением
userSchema.pre('save', async function(next) {
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

// статический метод для обновления среднего рейтинга хелпера
userSchema.statics.updateAverageRating = async function (userId) {
    const Review = mongoose.model('Review');
  try {
    const reviews = await Review.find({ helperId: userId });
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((acc, item) => acc + item.rating, 0);
      const newRating = (totalRating / reviews.length).toFixed(1);
      await this.findByIdAndUpdate(userId, { averageRating: newRating });
    } else {
      // Если у пользователя больше нет отзывов, рейтинг можно сбросить или оставить как есть
      await this.findByIdAndUpdate(userId, { averageRating: 0 }); // сбрасываем до 0
    }
  } catch (error) {
    console.error(`[updateAverageRating] Ошибка при обновлении среднего рейтинга для пользователя ${userId}:`, error);
  }
};

const User = mongoose.model('User', userSchema);

export default User; 