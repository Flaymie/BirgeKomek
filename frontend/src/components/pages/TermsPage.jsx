import React from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiAlertTriangle, FiCheckSquare } from 'react-icons/fi';

// Компонент для секции
const Section = ({ children, className = '' }) => (
  <section className={`py-16 sm:py-24 ${className}`}>
    <div className="container-custom">{children}</div>
  </section>
);

// Компонент для заголовка секции контента
const ContentHeader = ({ children }) => (
  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 border-l-4 border-primary-500 pl-4">
    {children}
  </h2>
);

// Компонент для параграфа
const P = ({ children }) => <p className="text-lg text-gray-700 mb-6 leading-relaxed">{children}</p>;

// Компонент для списка
const Ul = ({ children }) => <ul className="list-disc pl-6 mb-6 space-y-3 text-lg text-gray-700">{children}</ul>;

const TermsPage = () => {
  return (
    <div className="bg-white">
      {/* HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="relative container-custom text-center py-20 sm:py-28">
          <FiFileText className="text-white text-5xl mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">
            Условия использования
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-primary-100">
            Правила, которые помогают нам поддерживать порядок и дружелюбную атмосферу.
          </p>
        </div>
      </div>

      {/* Основной контент */}
      <Section>
        <div className="max-w-4xl mx-auto">
          <P><strong>Последнее обновление:</strong> 4 июня 2024 года</P>
          
          <ContentHeader>1. Принятие условий</ContentHeader>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertTriangle className="h-6 w-6 text-yellow-500 mt-0.5" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-yellow-800">
                Регистрируясь на платформе «Бірге Көмек», вы подтверждаете, что полностью прочитали, поняли и безоговорочно согласны с настоящими Условиями и нашей <Link to="/privacy" className="font-bold underline hover:text-yellow-900">Политикой конфиденциальности</Link>. Незнание правил не освобождает от ответственности.
                </p>
              </div>
            </div>
          </div>
          <P>
            Если вы не согласны с какими-либо из этих условий, пожалуйста, не используйте нашу платформу.
          </P>
          
          <ContentHeader>2. Описание платформы</ContentHeader>
          <P>
            «Бірге Көмек» — это сервис для взаимопомощи школьников в учёбе. Мы предоставляем инструменты для создания запросов, общения, обмена знаниями и оценки помощи других участников.
          </P>
          
          <ContentHeader>3. Ваш аккаунт</ContentHeader>
          <P>
            Вы несёте полную ответственность за все действия, которые происходят под вашим аккаунтом, и за сохранение его безопасности. Запрещено передавать доступ к своему аккаунту третьим лицам.
          </P>

          <ContentHeader>4. Правила поведения на платформе</ContentHeader>
          <P>Мы создали это сообщество для учёбы и взаимоуважения. Здесь строго запрещено:</P>
          <Ul>
            <li><strong>Оскорбления и агрессия:</strong> Любые формы троллинга, буллинга, враждебных высказываний, дискриминации и личных оскорблений в адрес других пользователей.</li>
            <li><strong>Спам и реклама:</strong> Массовая рассылка сообщений, реклама сторонних услуг, продуктов или ресурсов без согласования с администрацией.</li>
            <li><strong>Неприемлемый контент:</strong> Публикация материалов откровенно сексуального характера (18+), сцен насилия, а также любого другого контента, нарушающего законодательство РК.</li>
            <li><strong>Мошенничество и обман:</strong> Введение пользователей в заблуждение, попытки получить личные данные обманным путём или любое другое мошенничество.</li>
            <li><strong>Плагиат и списывание:</strong> Прямое копирование чужих ответов без указания авторства или выдача готовых решений за свою работу. Цель платформы — помочь разобраться, а не списать.</li>
            <li><strong>Мультиаккаунтинг:</strong> Создание и использование нескольких аккаунтов одним пользователем для накрутки рейтинга или обхода блокировок.</li>
          </Ul>

          <ContentHeader>5. Контент пользователей</ContentHeader>
          <P>
            Вы несёте ответственность за контент, который публикуете. Размещая его, вы даёте нам право использовать его для обеспечения работы платформы. Мы оставляем за собой право удалять любой контент, нарушающий наши правила, без предварительного уведомления.
          </P>

          <ContentHeader>6. Ограничение ответственности</ContentHeader>
          <P>
            Платформа предоставляется «как есть». Мы не гарантируем точность или полноту ответов, предоставляемых пользователями, и не несём ответственности за результаты их использования.
          </P>

          <ContentHeader>7. Нарушение правил и блокировка</ContentHeader>
          <P>
            За нарушение правил мы можем вынести предупреждение, временно или навсегда заблокировать ваш аккаунт. Решение о мере наказания принимается администрацией и является окончательным.
          </P>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Связь с нами</h3>
            <P>
              По вопросам, связанным с Условиями использования, пишите на: <a href="mailto:info@birgekomek.kz" className="text-primary-600 hover:underline">info@birgekomek.kz</a>
            </P>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default TermsPage; 