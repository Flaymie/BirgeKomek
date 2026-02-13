import React from 'react';

const AppLoader = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <img
            src="/img/logo_site_192.png"
            alt="Бірге Көмек"
            className="w-16 h-16 rounded-2xl mb-6"
        />
        <div className="w-40 h-0.5 bg-gray-100 rounded-full overflow-hidden">
            <div
                className="h-full bg-indigo-500 rounded-full"
                style={{
                    animation: 'slideLoader 1.2s ease-in-out infinite',
                }}
            />
        </div>
        <style>{`
      @keyframes slideLoader {
        0% { width: 0%; margin-left: 0; }
        50% { width: 60%; margin-left: 20%; }
        100% { width: 0%; margin-left: 100%; }
      }
    `}</style>
    </div>
);

export default AppLoader;
