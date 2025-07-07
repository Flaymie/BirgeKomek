import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiShield, FiHeart, FiArrowRight } from 'react-icons/fi';

// Компонент для карточки с ценностями
const ValueCard = ({ icon, title, children }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 transform hover:-translate-y-2 transition-transform duration-300 ease-in-out group">
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-5 group-hover:bg-primary-200 transition-colors duration-300">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{children}</p>
  </div>
);

// Компонент для секции
const Section = ({ children, className = '' }) => (
  <section className={`py-20 sm:py-28 ${className}`}>
    <div className="container-custom">{children}</div>
  </section>
);

const AboutPage = () => {
  return (
    <div className="bg-gray-50 page-fade-in">
      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800"></div>
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="relative container-custom text-center py-24 sm:py-32">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
            Помогаем учиться вместе
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-primary-100">
            «Бірге Көмек» — это не просто платформа, а сообщество, где каждый школьник Казахстана может найти поддержку и поделиться знаниями.
          </p>
        </div>
      </div>

      {/* МИССИЯ */}
      <Section className="bg-white">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="md:pr-10">
            <span className="text-primary-600 font-semibold uppercase tracking-wider">Наша миссия</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
              Образование, доступное каждому
            </h2>
            <div className="space-y-4 text-lg text-gray-600">
              <p>
                Мы верим, что знания не должны иметь границ. Наша цель - создать единое пространство, где ученики из разных городов и школ могут легко обмениваться опытом, помогать друг другу и расти вместе.
              </p>
              <p>
                Помогая другим, ты не только закрепляешь материал, но и развиваешь эмпатию, коммуникабельность и умение работать в команде - навыки, которые важны не только в учёбе, но и в жизни.
              </p>
            </div>
          </div>
          <div className="relative h-80 md:h-full rounded-xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1471&q=80" 
              alt="Студенты учатся вместе" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-primary-800 opacity-20"></div>
          </div>
        </div>
      </Section>
      
      {/* ЦЕННОСТИ */}
      <Section>
        <div className="text-center mb-16">
          <span className="text-primary-600 font-semibold uppercase tracking-wider">Наши ценности</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
            Что нами движет
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <ValueCard icon={<FiHeart className="h-8 w-8 text-primary-600" />}>
            <strong>Доступность</strong>
            <br/>Мы стремимся сделать качественную взаимопомощь в учёбе доступной для всех, независимо от города и школы.
          </ValueCard>
          <ValueCard icon={<FiUsers className="h-8 w-8 text-primary-600" />}>
            <strong>Сообщество</strong>
            <br/>Мы строим дружное и безопасное сообщество, где каждый чувствует себя комфортно, делясь знаниями и получая помощь.
          </ValueCard>
          <ValueCard icon={<FiShield className="h-8 w-8 text-primary-600" />}>
            <strong>Безопасность</strong>
            <br/>Мы обеспечиваем безопасную среду, защищая данные пользователей и модерируя контент, чтобы общение было только позитивным.
          </ValueCard>
        </div>
      </Section>

      {/* CTA */}
      <Section className="bg-gradient-to-br from-primary-700 to-primary-900">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Готовы присоединиться?</h2>
          <p className="text-xl text-primary-200 mb-10 max-w-2xl mx-auto">
            Станьте частью нашего растущего сообщества. Помогайте, учитесь и достигайте новых высот вместе с нами!
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/register" className="btn bg-white text-primary-700 hover:bg-primary-50 text-lg font-semibold px-8 py-3 transform hover:scale-105 transition-transform duration-300 shadow-lg">
              Начать сейчас
            </Link>
            <Link to="/requests" className="group text-white font-semibold px-6 py-3 transition-all duration-300 flex items-center gap-2">
              <span>Смотреть запросы</span>
              <FiArrowRight className="transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default AboutPage; 