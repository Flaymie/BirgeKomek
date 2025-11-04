import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Review from '../models/Review.js';

dotenv.config();

const recalculateAllRatings = async () => {
  try {
    console.log('🔄 Подключение к MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    // Получаем всех пользователей с отзывами
    const allReviews = await Review.find().distinct('helperId');
    console.log(`📊 Найдено ${allReviews.length} пользователей с отзывами`);

    let updated = 0;
    let errors = 0;

    for (const userId of allReviews) {
      try {
        const reviews = await Review.find({ helperId: userId });
        
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((acc, item) => acc + item.rating, 0);
          const newRating = parseFloat((totalRating / reviews.length).toFixed(1));
          
          const user = await User.findById(userId);
          if (user) {
            const oldRating = user.averageRating;
            await User.findByIdAndUpdate(userId, { averageRating: newRating });
            console.log(`✅ ${user.username}: ${oldRating} → ${newRating} (${reviews.length} отзывов)`);
            updated++;
          }
        }
      } catch (err) {
        console.error(`❌ Ошибка при обновлении рейтинга для ${userId}:`, err.message);
        errors++;
      }
    }

    console.log('\n📈 Результаты:');
    console.log(`   Обновлено: ${updated}`);
    console.log(`   Ошибок: ${errors}`);
    console.log('✅ Пересчет завершен!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

recalculateAllRatings();
