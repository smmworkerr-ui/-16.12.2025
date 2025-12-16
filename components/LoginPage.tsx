
import React, { useState, useEffect } from 'react';
import { RomanOneIcon } from './icons';

interface LoginPageProps {
  onLogin: () => void;
}

type ApiEnvironment = 'local' | 'production';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [currentEnv, setCurrentEnv] = useState<ApiEnvironment>('local');

  useEffect(() => {
    const savedEnv = window.localStorage.getItem('api_environment') as ApiEnvironment | null;
    if (savedEnv && ['local', 'production'].includes(savedEnv)) {
      setCurrentEnv(savedEnv);
    }
  }, []);

  const handleEnvChange = (newEnv: ApiEnvironment) => {
    window.localStorage.setItem('api_environment', newEnv);
    window.location.reload();
  };

  const getButtonClass = (env: ApiEnvironment) => {
    return `px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
      currentEnv === env 
        ? 'bg-white text-black shadow-md' 
        : 'text-gray-400 hover:text-white hover:bg-white/10'
    }`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white relative overflow-hidden font-sans">
      
      {/* Animated Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-[1000px] h-[1000px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        
        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl flex flex-col items-center text-center">
            
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-8 transform hover:scale-105 transition-transform duration-500">
                <RomanOneIcon className="w-12 h-12 text-white drop-shadow-md" />
            </div>

            <h1 className="text-4xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                VK Messenger AI
            </h1>
            <p className="text-gray-400 text-sm mb-10 leading-relaxed max-w-xs">
                Автоматизация рассылок нового поколения. <br/> Управляйте диалогами, клиентами и продажами.
            </p>

            <button
                onClick={onLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-[0.98] group"
            >
                <span className="text-lg">Войти в систему</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <div className="mt-8 pt-6 border-t border-white/5 w-full">
                <div className="flex flex-col items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">API Environment</span>
                    <div className="inline-flex bg-black/20 p-1 rounded-xl border border-white/5">
                        <button onClick={() => handleEnvChange('local')} className={getButtonClass('local')}>
                            Localhost
                        </button>
                        <button onClick={() => handleEnvChange('production')} className={getButtonClass('production')} disabled>
                            Cloud (Pro)
                        </button>
                    </div>
                </div>
            </div>

        </div>
        
        <div className="mt-6 text-center">
            <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Powered by React & Python Flask</p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
