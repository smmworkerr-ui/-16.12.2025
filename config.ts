// URL для "боевого" бэкенда (пример)
// const PRODUCTION_API_URL = 'https://prod-backend.example.com/api';

// URL для локального бэкенда
const LOCAL_API_URL = 'http://127.0.0.1:5000/api';

/**
 * Определяет базовый URL API на основе значения в localStorage.
 * @returns {string} Базовый URL для всех запросов к API.
 */
const getApiBaseUrl = (): string => {
  try {
    const storedEnv = window.localStorage.getItem('api_environment') || 'local';
    
    switch (storedEnv) {
        // case 'production':
        //     return PRODUCTION_API_URL;
        case 'local':
        default:
            return LOCAL_API_URL;
    }
  } catch (error) {
    // Фоллбэк на случай, если localStorage недоступен (например, в SSR или из-за настроек безопасности)
    console.error('Не удалось прочитать localStorage для определения окружения API:', error);
    return LOCAL_API_URL;
  }
};

// Экспортируем результат вызова функции.
// URL определяется один раз при загрузке приложения.
export const API_BASE_URL = getApiBaseUrl();