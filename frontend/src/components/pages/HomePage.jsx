import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="animate-fadeIn">
      {/* Hero секция */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 -top-36 w-72 h-72 rounded-full bg-white opacity-10 animate-pulse-slow"></div>
          <div className="absolute -left-10 top-1/2 w-56 h-56 rounded-full bg-secondary-400 opacity-10 animate-pulse-slow" style={{animationDelay: '1s'}}></div>
          <div className="absolute right-1/3 bottom-0 w-48 h-48 rounded-full bg-primary-400 opacity-10 animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="container-custom relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Взаимопомощь школьников Казахстана
              </h1>
              <p className="text-xl mb-8 text-primary-100 max-w-lg">
                Платформа, где школьники могут помогать друг другу в учебе и получать помощь от сверстников
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="btn bg-white text-primary-600 hover:bg-primary-100 font-semibold px-6 py-3 hover:scale-105 shadow-lg hover:shadow-xl transition-all transform">
                  Присоединиться
                </Link>
                <Link to="/requests" className="btn border-2 border-white text-white hover:bg-white/10 font-semibold px-6 py-3 hover:scale-105 transition-all transform">
                  Посмотреть запросы
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 mt-8 md:mt-0">
              <img 
                src="https://placehold.co/600x400" 
                alt="Школьники помогают друг другу" 
                className="rounded-lg shadow-xl mx-auto hover-scale transition-all duration-500 hover:shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Как это работает */}
      <section className="py-20 bg-white">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-center mb-16 relative">
            Как это работает
            <span className="absolute w-20 h-1 bg-primary-500 bottom-0 left-1/2 transform -translate-x-1/2 -mb-4"></span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center transform transition-all hover:translate-y-[-8px] hover:shadow-lg">
              <div className="bg-primary-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-inner">
                <span className="text-primary-600 text-3xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Создай запрос на помощь</h3>
              <p className="text-gray-600">
                Опиши с чем тебе нужна помощь по учебе или предложи свою помощь в предметах, которые тебе даются легко
              </p>
            </div>
            
            <div className="card text-center transform transition-all hover:translate-y-[-8px] hover:shadow-lg">
              <div className="bg-primary-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-inner">
                <span className="text-primary-600 text-3xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Общайся со сверстниками</h3>
              <p className="text-gray-600">
                Связывайся с другими школьниками через чат, обменивайся материалами и объяснениями
              </p>
            </div>
            
            <div className="card text-center transform transition-all hover:translate-y-[-8px] hover:shadow-lg">
              <div className="bg-primary-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-inner">
                <span className="text-primary-600 text-3xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Получай рейтинг и благодарности</h3>
              <p className="text-gray-600">
                За качественную помощь получай хорошие отзывы, повышай рейтинг и становись популярным наставником
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Популярные предметы */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-center mb-16 relative">
            Популярные предметы
            <span className="absolute w-20 h-1 bg-primary-500 bottom-0 left-1/2 transform -translate-x-1/2 -mb-4"></span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {['Математика', 'Физика', 'Химия', 'Биология', 'История', 'Литература', 'Информатика', 'Английский язык'].map((subject, idx) => (
              <Link 
                key={idx}
                to={`/subjects/${subject.toLowerCase()}`} 
                className="bg-white hover:bg-primary-50 border border-gray-200 rounded-lg p-6 text-center transition-all duration-300 shadow-sm hover:shadow-md transform hover:translate-y-[-5px]"
              >
                <h3 className="font-medium text-lg">{subject}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-secondary-600 to-secondary-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 top-10 w-56 h-56 rounded-full bg-white opacity-10 animate-pulse-slow"></div>
          <div className="absolute -left-20 bottom-0 w-72 h-72 rounded-full bg-secondary-400 opacity-10 animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="container-custom text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Готов помогать и учиться?</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto">
            Присоединяйся к сообществу школьников, которые помогают друг другу стать лучше в учебе
          </p>
          <Link to="/register" className="btn bg-white text-secondary-600 hover:bg-secondary-100 font-semibold px-8 py-4 text-lg rounded-lg shadow-lg hover:shadow-xl transform transition-all hover:scale-105 duration-300">
            Зарегистрироваться
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 