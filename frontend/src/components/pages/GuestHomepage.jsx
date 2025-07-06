import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiPlusCircle, FiStar } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../shared/LanguageSwitcher';

const GuestHomepage = () => {
  const { t } = useTranslation('homepage');

  return (
    <div className="animate-fadeIn relative">
      {/* Переключатель языка */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher isGuest={true} />
      </div>

      {/* Hero секция */}
      <section className="relative text-white bg-gray-900">
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop')" }}
        ></div>
        <div className="relative container-custom py-24 md:py-36 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-shadow-lg">
                {t('hero.title')}
            </h1>
            <p className="text-lg md:text-2xl text-gray-200 max-w-3xl mx-auto mb-8 text-shadow">
                {t('hero.subtitle')}
            </p>
            <div className="flex justify-center gap-4">
                <Link to="/register" className="btn btn-lg btn-primary">
                    {t('hero.joinButton')}
                </Link>
                <Link to="/requests" className="btn btn-lg btn-secondary">
                    {t('hero.viewRequestsButton')}
                </Link>
            </div>
        </div>
      </section>

      {/* "Как это работает" */}
      <section className="py-20 bg-white">
          <div className="container-custom">
            <h2 className="text-3xl font-bold text-center mb-12">{t('howItWorks.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="p-8 border border-gray-200 rounded-lg shadow-sm hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                <FiPlusCircle className="text-4xl text-primary-500 mx-auto mb-4"/>
                <h3 className="text-xl font-semibold mb-2">{t('howItWorks.step1.title')}</h3>
                <p className="text-gray-600">{t('howItWorks.step1.description')}</p>
              </div>
              <div className="p-8 border border-gray-200 rounded-lg shadow-sm hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                <FiBookOpen className="text-4xl text-primary-500 mx-auto mb-4"/>
                <h3 className="text-xl font-semibold mb-2">{t('howItWorks.step2.title')}</h3>
                <p className="text-gray-600">{t('howItWorks.step2.description')}</p>
              </div>
              <div className="p-8 border border-gray-200 rounded-lg shadow-sm hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                <FiStar className="text-4xl text-primary-500 mx-auto mb-4"/>
                <h3 className="text-xl font-semibold mb-2">{t('howItWorks.step3.title')}</h3>
                <p className="text-gray-600">{t('howItWorks.step3.description')}</p>
              </div>
            </div>
          </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom text-center">
            <h2 className="text-3xl font-bold mb-4">{t('cta.title')}</h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">
                {t('cta.subtitle')}
            </p>
            <Link to="/register" className="btn btn-lg btn-primary flex items-center gap-2 mx-auto w-max">
                {t('cta.button')} <FiArrowRight />
            </Link>
        </div>
      </section>
    </div>
  );
};

export default GuestHomepage; 