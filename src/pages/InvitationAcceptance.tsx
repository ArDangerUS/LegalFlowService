// src/pages/InvitationAcceptance.tsx - Обновленная страница регистрации

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvitationService, InvitationData } from '../services/invitationService';

export const InvitationAcceptance: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Загрузка данных приглашения
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Недействительная ссылка приглашения');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Loading invitation for token:', token);

        // Определяем правильный URL для API
        const apiBaseUrl = window.location.port === '5173' || window.location.port === '3001'
          ? 'http://localhost:3000'
          : '';

        const response = await fetch(`${apiBaseUrl}/api/invitations/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 API response status:', response.status);
        console.log('📡 API response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Не удалось загрузить приглашение');
        }

        const data = await response.json();
        console.log('✅ Invitation data loaded:', data);
        setInvitationData(data);
      } catch (err) {
        console.error('❌ Error loading invitation:', err);
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  // Валидация формы
  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      errors.name = 'Полное имя обязательно';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Имя должно содержать не менее 2 символов';
    }

    if (!formData.password) {
      errors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      errors.password = 'Пароль должен содержать не менее 6 символов';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Подтверждение пароля обязательно';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Обработка регистрации
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      console.log('🔐 Registering user with token:', token);

      // Определяем правильный URL для API
      const apiBaseUrl = window.location.port === '5173' || window.location.port === '3001'
        ? 'http://localhost:3000'
        : '';

      const response = await fetch(`${apiBaseUrl}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          password: formData.password
        })
      });

      console.log('📡 Registration response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка регистрации');
      }

      const result = await response.json();
      console.log('✅ Registration successful:', result);

      // Показываем сообщение об успехе и перенаправляем
      alert('✅ Регистрация завершена успешно!\n\nПерейдите на страницу входа для авторизации.');
      navigate('/login');

    } catch (err) {
      console.error('❌ Registration error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setRegistering(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      admin: 'Администратор',
      office_admin: 'Администратор офиса',
      lawyer: 'Юрист',
      client: 'Клиент'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Проверка приглашения</h2>
          <p className="text-gray-600">Проверка действительности вашего приглашения...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Недействительное или истекшее приглашение
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
          </div>

          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Возможные причины:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Срок действия приглашения истек</li>
              <li>• Приглашение уже было использовано</li>
              <li>• Недействительная ссылка приглашения</li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Заголовок */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
            <h1 className="text-3xl font-bold mb-2">LegalFlow</h1>
            <p className="text-blue-100">Система управления юридическими делами</p>
          </div>

          <div className="bg-white px-6 py-4 border-x border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Завершить регистрацию
            </h2>
            <p className="text-gray-600">
              Вас пригласили присоединиться к LegalFlow
            </p>
          </div>
        </div>

        {/* Информация о приглашении */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 rounded-t-lg">
            <h3 className="text-lg font-medium text-blue-900">Детали приглашения</h3>
          </div>

          <div className="px-6 py-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{invitationData?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Роль:</span>
              <span className="font-medium text-blue-600">
                {getRoleDisplayName(invitationData?.role || '')}
              </span>
            </div>
            {invitationData?.officeName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Офис:</span>
                <span className="font-medium text-gray-900">{invitationData.officeName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Действительно до:</span>
              <span className="font-medium text-gray-900">
                {formatExpiryDate(invitationData?.expiresAt || '')}
              </span>
            </div>
          </div>
        </div>

        {/* Форма регистрации */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Создание аккаунта</h3>
          </div>

          <form onSubmit={handleRegistration} className="px-6 py-4 space-y-4">
            {/* Имя */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Полное имя *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Введите ваше полное имя"
                disabled={registering}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пароль *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Введите ваш пароль"
                disabled={registering}
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            {/* Подтверждение пароля */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подтвердите пароль *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Введите пароль еще раз"
                disabled={registering}
              />
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Ошибка регистрации */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Кнопка регистрации */}
            <button
              type="submit"
              disabled={registering}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {registering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Создание аккаунта...
                </>
              ) : (
                'Создать аккаунт'
              )}
            </button>
          </form>
        </div>

        {/* Примечание о безопасности */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            🔒 Ваши данные защищены шифрованием и соответствуют стандартам безопасности.
          </p>
        </div>
      </div>
    </div>
  );
};