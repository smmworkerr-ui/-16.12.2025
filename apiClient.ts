import { API_BASE_URL } from './config';

/**
 * Вспомогательная функция для обработки ответов от fetch.
 */
async function handleResponse<T>(response: Response, endpoint: string, startTime: number): Promise<T> {
  let text = '';
  try {
      text = await response.text();
  } catch (e) {
      text = '<Failed to read response body>';
  }
  
  const duration = Date.now() - startTime;
  // Исключаем поллинг логов из логов консоли, чтобы не создавать рекурсию/шум
  // Проверяем вхождение подстроки
  const isPolling = ['app-logs', 'campaign-logs', 'health-check'].some(x => endpoint.includes(x));

  if (!isPolling) {
      const statusColor = response.ok ? '#10b981' : '#ef4444'; // Green or Red
      console.groupCollapsed(`%c${response.status}%c ${endpoint} %c(${duration}ms)`, `color: ${statusColor}; font-weight: bold`, 'color: inherit; font-weight: bold', 'color: gray; font-weight: normal');
      try {
          if (text) console.log('Response Body:', JSON.parse(text));
      } catch {
          console.log('Response Body (raw):', text);
      }
      console.groupEnd();
  }
  
  if (!response.ok) {
    let errorMessage = `Ошибка сервера (${response.status})`;
    try {
        const jsonError = JSON.parse(text);
        errorMessage = jsonError.error || jsonError.message || errorMessage;
    } catch (e) {
        errorMessage += `: ${text.slice(0, 100)}`;
    }
    
    // Если это поллинг, используем warn, чтобы не пугать юзера красным в консоли каждые 2 сек, если сервер лежит
    if (isPolling) {
        // console.warn(`⚠️ Polling failed [${endpoint}]: ${errorMessage}`);
        // Можно вообще подавить вывод для health-check, чтобы не мусорить
    } else {
        console.error(`❌ API Fail [${endpoint}]:`, errorMessage);
    }
    throw new Error(errorMessage);
  }

  if (text && text.trim().length > 0) {
      try {
          return JSON.parse(text) as T;
      } catch (e) {
          if (!isPolling) console.warn("Server returned non-JSON response:", text.slice(0, 50));
          return {} as T;
      }
  }
  
  return {} as T;
}

const logRequest = (method: string, endpoint: string, body?: object) => {
    const isPolling = ['app-logs', 'campaign-logs', 'health-check'].some(x => endpoint.includes(x));
    if (!isPolling) {
        console.groupCollapsed(`%c${method} %c${endpoint}`, 'color: #3b82f6; font-weight: bold', 'color: inherit; font-weight: normal');
        if (body) console.log('Request Body:', body);
        console.groupEnd();
    }
};

export const get = async <T>(endpoint: string): Promise<T> => {
  logRequest('GET', endpoint);
  const start = Date.now();
  const url = new URL(`${API_BASE_URL}/${endpoint}`);
  // Добавляем timestamp для предотвращения кэширования
  url.searchParams.append('cb', Date.now().toString());
  
  try {
      const response = await fetch(url.toString());
      return handleResponse<T>(response, endpoint, start);
  } catch (error: any) {
      const isPolling = ['app-logs', 'campaign-logs', 'health-check'].some(x => endpoint.includes(x));
      if (!isPolling) {
          console.error(`❌ Network Error [GET ${endpoint}]:`, error);
      } else {
          // Для поллинга ничего не выводим в консоль, чтобы не засорять её "Failed to fetch" при выключенном сервере
      }
      throw error;
  }
};

export const post = async <T>(endpoint: string, body: object): Promise<T> => {
  logRequest('POST', endpoint, body);
  const start = Date.now();
  try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return handleResponse<T>(response, endpoint, start);
  } catch (error: any) {
      console.error(`❌ Network Error [POST ${endpoint}]:`, error);
      throw error;
  }
};

export const put = async <T>(endpoint: string, body: object): Promise<T> => {
  logRequest('PUT', endpoint, body);
  const start = Date.now();
  try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return handleResponse<T>(response, endpoint, start);
  } catch (error: any) {
      console.error(`❌ Network Error [PUT ${endpoint}]:`, error);
      throw error;
  }
};

export const del = async <T>(endpoint: string): Promise<T> => {
  logRequest('DELETE', endpoint);
  const start = Date.now();
  try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'DELETE',
      });
      return handleResponse<T>(response, endpoint, start);
  } catch (error: any) {
      console.error(`❌ Network Error [DELETE ${endpoint}]:`, error);
      throw error;
  }
};