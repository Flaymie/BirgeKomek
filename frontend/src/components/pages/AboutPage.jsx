import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <div className="bg-white py-12">
      <div className="container-custom">
        <h1 className="text-3xl font-bold mb-8" data-aos="fade-up">О проекте "Бірге Көмек"</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div data-aos="fade-right" data-aos-delay="100">
            <h2 className="text-2xl font-semibold mb-4">Наша миссия</h2>
            <p className="text-gray-700 mb-4">
              Мы создаем сообщество взаимопомощи для школьников Казахстана, где каждый может получить поддержку в учебе 
              и поделиться своими знаниями с другими. Мы верим, что совместное обучение - это путь к лучшим результатам.
            </p>
            <p className="text-gray-700">
              Наша цель - сделать образование доступнее и эффективнее через взаимодействие между учениками, 
              создавая пространство, где помощь всегда рядом.
            </p>
          </div>
          
          <div className="relative h-64 md:h-auto" data-aos="fade-left" data-aos-delay="200">
            <img 
              src="/images/mission.jpg" 
              alt="Школьники помогают друг другу" 
              className="rounded-lg shadow-lg w-full h-full object-cover"
            />
          </div>
        </div>
        
        <div className="mb-12" data-aos="fade-up" data-aos-delay="100">
          <h2 className="text-2xl font-semibold mb-4">Почему "Бірге Көмек"?</h2>
          <p className="text-gray-700 mb-4">
            "Бірге Көмек" в переводе с казахского означает "Помощь вместе". Это отражает суть нашего проекта - 
            объединение усилий школьников для взаимной поддержки в образовании.
          </p>
          <p className="text-gray-700">
            Мы создали платформу, которая соединяет тех, кто ищет помощь, с теми, кто готов помочь. 
            Это не просто сервис - это сообщество, где каждый может быть и учеником, и учителем.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-blue-50 p-6 rounded-lg shadow" data-aos="fade-up" data-aos-delay="100">
            <h3 className="text-xl font-semibold mb-3">Для учеников</h3>
            <p className="text-gray-700">
              Получайте помощь по любому предмету школьной программы. Задавайте вопросы, делитесь трудностями 
              и находите тех, кто поможет разобраться в сложных темах.
            </p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg shadow" data-aos="fade-up" data-aos-delay="200">
            <h3 className="text-xl font-semibold mb-3">Для помощников</h3>
            <p className="text-gray-700">
              Делитесь своими знаниями, помогайте другим и развивайте свои навыки объяснения. 
              Помогая другим, вы лучше усваиваете материал сами.
            </p>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg shadow" data-aos="fade-up" data-aos-delay="300">
            <h3 className="text-xl font-semibold mb-3">Для всех</h3>
            <p className="text-gray-700">
              Создавайте связи с единомышленниками, формируйте группы по интересам и учебным предметам, 
              обменивайтесь полезными материалами и ресурсами.
            </p>
          </div>
        </div>
        
        <div className="mb-12" data-aos="fade-up" data-aos-delay="100">
          <h2 className="text-2xl font-semibold mb-4">Наши ценности</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Взаимоуважение</strong> - мы ценим вклад каждого участника сообщества</li>
            <li><strong>Доступность</strong> - образование должно быть доступно для всех</li>
            <li><strong>Качество</strong> - мы стремимся к высокому уровню помощи и поддержки</li>
            <li><strong>Сотрудничество</strong> - вместе мы можем достичь большего</li>
            <li><strong>Инновации</strong> - мы постоянно совершенствуем нашу платформу</li>
          </ul>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="relative h-64 md:h-auto" data-aos="fade-right" data-aos-delay="100">
            <img 
              src="/images/team.jpg" 
              alt="Наша команда" 
              className="rounded-lg shadow-lg w-full h-full object-cover"
            />
          </div>
          
          <div data-aos="fade-left" data-aos-delay="200">
            <h2 className="text-2xl font-semibold mb-4">Наша команда</h2>
            <p className="text-gray-700 mb-4">
              Мы - команда молодых специалистов, увлеченных идеей улучшения образования в Казахстане. 
              Среди нас есть педагоги, разработчики, дизайнеры и бывшие школьники, которые на собственном опыте 
              знают о трудностях в обучении.
            </p>
            <p className="text-gray-700">
              Мы объединились, чтобы создать платформу, которая решает реальные проблемы школьников 
              и делает процесс обучения более эффективным и увлекательным.
            </p>
          </div>
        </div>
        
        <div className="text-center" data-aos="fade-up" data-aos-delay="100">
          <h2 className="text-2xl font-semibold mb-4">Присоединяйтесь к нам!</h2>
          <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            Станьте частью сообщества "Бірге Көмек" и вместе мы сделаем образование лучше. 
            Регистрируйтесь, задавайте вопросы, помогайте другим и растите вместе с нами!
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300">
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutPage; 