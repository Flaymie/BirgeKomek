import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="bg-white py-12">
      <div className="container-custom">
        <h1 className="text-3xl font-bold mb-8" data-aos="fade-up">Политика конфиденциальности</h1>
        
        <div className="prose max-w-none">
          <p className="mb-6" data-aos="fade-up" data-aos-delay="100">
            Последнее обновление: 20 мая 2025 года
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4" data-aos="fade-up" data-aos-delay="150">1. Введение</h2>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="200">
            Добро пожаловать на платформу "Бірге Көмеk". Мы уважаем вашу конфиденциальность и стремимся защитить ваши персональные данные. 
            Эта Политика конфиденциальности объясняет, как мы собираем, используем, раскрываем, передаем и храним вашу информацию.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4" data-aos="fade-up" data-aos-delay="150">2. Какую информацию мы собираем</h2>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="200">
            Мы можем собирать следующие типы информации:
          </p>
          <ul className="list-disc pl-6 mb-6" data-aos="fade-up" data-aos-delay="250">
            <li className="mb-2">
              <strong>Информация профиля:</strong> имя, фамилия, адрес электронной почты, пароль, фотография профиля, школа, класс и другая информация, которую вы предоставляете при создании аккаунта.
            </li>
            <li className="mb-2">
              <strong>Контактная информация:</strong> адрес электронной почты, номер телефона.
            </li>
            <li className="mb-2">
              <strong>Содержание:</strong> информация о запросах на помощь, сообщениях, отзывах и другом контенте, который вы создаете на платформе.
            </li>
            <li className="mb-2">
              <strong>Техническая информация:</strong> IP-адрес, тип устройства, тип браузера, язык браузера, дата и время доступа, URL-адреса перехода.
            </li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4" data-aos="fade-up" data-aos-delay="150">3. Как мы используем вашу информацию</h2>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="200">
            Мы используем собранную информацию для следующих целей:
          </p>
          <ul className="list-disc pl-6 mb-6" data-aos="fade-up" data-aos-delay="250">
            <li className="mb-2">Предоставление и улучшение наших услуг</li>
            <li className="mb-2">Обеспечение безопасности платформы</li>
            <li className="mb-2">Связь с вами по вопросам, связанным с использованием платформы</li>
            <li className="mb-2">Персонализация вашего опыта на платформе</li>
            <li className="mb-2">Анализ использования платформы для улучшения функциональности</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4" data-aos="fade-up" data-aos-delay="150">4. Раскрытие информации</h2>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="200">
            Мы не продаем, не обмениваем и не передаем ваши личные данные третьим лицам без вашего согласия, за исключением случаев, описанных в этой Политике конфиденциальности.
          </p>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="250">
            Мы можем раскрывать вашу информацию:
          </p>
          <ul className="list-disc pl-6 mb-6" data-aos="fade-up" data-aos-delay="300">
            <li className="mb-2">Поставщикам услуг, которые помогают нам в работе платформы</li>
            <li className="mb-2">В ответ на законные запросы от государственных органов</li>
            <li className="mb-2">Для защиты наших прав, конфиденциальности, безопасности или собственности</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4" data-aos="fade-up" data-aos-delay="150">5. Безопасность данных</h2>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="200">
            Мы принимаем разумные меры для защиты вашей информации от несанкционированного доступа, использования или раскрытия. 
            Однако, ни один метод передачи через Интернет или метод электронного хранения не является 100% безопасным, 
            поэтому мы не можем гарантировать абсолютную безопасность.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4" data-aos="fade-up" data-aos-delay="150">6. Права пользователей</h2>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="200">
            Вы имеете право:
          </p>
          <ul className="list-disc pl-6 mb-6" data-aos="fade-up" data-aos-delay="250">
            <li className="mb-2">Получать доступ к своим персональным данным</li>
            <li className="mb-2">Исправлять неточные персональные данные</li>
            <li className="mb-2">Удалять свои персональные данные</li>
            <li className="mb-2">Возражать против обработки ваших персональных данных</li>
            <li className="mb-2">Ограничивать обработку ваших персональных данных</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4" data-aos="fade-up" data-aos-delay="150">7. Изменения в Политике конфиденциальности</h2>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="200">
            Мы можем обновлять эту Политику конфиденциальности время от времени. 
            Мы уведомим вас о любых изменениях, разместив новую Политику конфиденциальности на этой странице 
            и обновив дату "последнего обновления" в начале документа.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4" data-aos="fade-up" data-aos-delay="150">8. Контактная информация</h2>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="200">
            Если у вас есть вопросы или предложения относительно нашей Политики конфиденциальности, 
            пожалуйста, свяжитесь с нами:
          </p>
          <p className="mb-4" data-aos="fade-up" data-aos-delay="250">
            Email: info@birgekomek.kz<br />
            Телефон: +7 (777) 123-45-67<br />
            Адрес: г. Алматы, Казахстан
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage; 