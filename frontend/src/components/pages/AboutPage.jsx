import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <div className="bg-white">
      {/* Герой-секция */}
      <div className="relative bg-gradient-to-r from-primary-600 to-primary-800 py-16 sm:py-24">
        <div className="container-custom text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">О нас</h1>
          <p className="mt-6 max-w-3xl mx-auto text-xl text-primary-100">
            Помогаем школьникам Казахстана учиться вместе и поддерживать друг друга
          </p>
        </div>
      </div>

      {/* Наша миссия */}
      <div className="py-16 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Наша миссия</h2>
            <p className="text-lg text-gray-600 mb-6">
              Бірге Көмек создан для того, чтобы объединить школьников Казахстана в едином образовательном пространстве, 
              где каждый может получить помощь и сам помочь другим в учебе.
            </p>
            <p className="text-lg text-gray-600 mb-6">
              Мы верим, что современное образование должно быть доступным для всех, независимо от места проживания и 
              финансовых возможностей. Наша платформа даёт возможность учащимся разных школ обмениваться знаниями, 
              опытом и учебными материалами.
            </p>
            <p className="text-lg text-gray-600">
              Помогая друг другу, школьники не только закрепляют свои знания, но и развивают важные социальные навыки: 
              эмпатию, коммуникацию и командную работу.
            </p>
          </div>
        </div>
      </div>

      {/* Наши ценности */}
      <div className="py-16 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Наши ценности</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Доступность</h3>
              <p className="text-gray-600">
                Мы стремимся сделать образование доступным для всех школьников Казахстана, независимо от их местоположения и материальных возможностей.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Сообщество</h3>
              <p className="text-gray-600">
                Мы создаем дружественное сообщество, где каждый может найти единомышленников и получить поддержку в обучении.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Безопасность</h3>
              <p className="text-gray-600">
                Мы обеспечиваем безопасное пространство для обмена знаниями, где уважаются права и достоинство каждого участника.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* CTA */}
      <div className="py-16 bg-primary-600">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Присоединяйтесь к нам!</h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Станьте частью сообщества взаимопомощи школьников и начните делиться знаниями уже сегодня
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="btn bg-white text-primary-600 hover:bg-primary-50 font-semibold px-6 py-3 hover:scale-105 transition-all transform">
              Зарегистрироваться
            </Link>
            <Link to="/requests" className="btn border-2 border-white text-white hover:bg-white/10 font-semibold px-6 py-3 hover:scale-105 transition-all transform">
              Посмотреть запросы
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage; 