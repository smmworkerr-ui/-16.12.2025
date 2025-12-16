import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  // Это главный компонент приложения.
  // Он решает, что показать пользователю: страницу входа или основную панель.

  // Состояние для отслеживания "входа" пользователя.
  // В реальном приложении здесь была бы сложная логика с токенами и аутентификацией.
  // Мы просто переключаем true/false для симуляции.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Функция, которая "логинит" пользователя.
  // Вызывается при нажатии кнопки на LoginPage.
  const handleLogin = () => {
    console.log("Симуляция входа через VK...");
    setIsLoggedIn(true); // Меняем состояние, что вызывает перерисовку и показ Dashboard.
  };

  return (
    // Используем тернарный оператор для выбора компонента для рендера.
    // Если isLoggedIn равно true, показываем <Dashboard />, иначе — <LoginPage />.
    <>
      {isLoggedIn ? <Dashboard /> : <LoginPage onLogin={handleLogin} />}
    </>
  );
};

export default App;