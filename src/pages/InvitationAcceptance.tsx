import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvitationService } from '../services/invitationService';

interface InvitationData {
  email: string;
  role: string;
  officeName?: string;
  inviterName: string;
  expiresAt: string;
}

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
        const response = await fetch(`/api/invitations/${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Не удалось загрузить приглашение');
        }
        
        const data = await response.json();
        setInvitationData(data);
      } catch (err) {
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
      await InvitationService.acceptInvitation(token!, {
        name: formData.name.trim(),
        password: formData.password
      });

      // Показываем сообщение об успехе
      alert('Регистрация завершена успешно! Перенаправление на панель управления...');
      
      // Перенаправляем на страницу входа или дашборд
      navigate('/login');
      
    } catch (err) {
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
              <span className="font-medium text-gray-900">
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
              <span className="text-gray-600">Приглашен:</span>
              <span className="font-medium text-gray-900">{invitationData?.inviterName}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Действительно до:</span>
              <span className="font-medium text-gray-900">
                {formatExpiryDate(invitationData?.expiresAt || '')}
              </span>
            </div>
          </div>
        </div>

        {/* Форма регистрации */}
        <form onSubmit={handleRegistration} className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Полное имя *
              </label>
              <input
                id="name"
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
                <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Пароль *
              </label>
              <input
                id="password"
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
                <p className="text-red-600 text-sm mt-1">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Подтвердите пароль *
              </label>
              <input
                id="confirmPassword"
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
                <p className="text-red-600 text-sm mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={registering}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 font-medium"
            >
              {registering ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Создание аккаунта...
                </span>
              ) : (
                'Создать аккаунт'
              )}
            </button>
          </div>
        </form>

        {/* Информация о безопасности */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-green-600 text-lg">🔒</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Безопасность</h3>
              <p className="text-sm text-green-700 mt-1">
                Ваши данные защищены шифрованием и соответствуют стандартам безопасности.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// components/InvitationSuccessModal.tsx - Модальное окно успешной регистрации
import React from 'react';

interface InvitationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  role: string;
  officeName?: string;
}

export const InvitationSuccessModal: React.FC<InvitationSuccessModalProps> = ({
  isOpen,
  onClose,
  userName,
  role,
  officeName
}) => {
  if (!isOpen) return null;

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      admin: 'Администратор',
      office_admin: 'Администратор офиса',
      lawyer: 'Юрист',
      client: 'Клиент'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <span className="text-3xl">✅</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Регистрация завершена!
          </h2>
          
          <p className="text-gray-600 mb-6">
            Добро пожаловать в LegalFlow, {userName}!
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-blue-900 mb-2">Ваши данные:</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-blue-700">Роль:</span> {getRoleDisplayName(role)}</p>
              {officeName && (
                <p><span className="text-blue-700">Офис:</span> {officeName}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Перейти к панели управления
            </button>
            
            <p className="text-xs text-gray-500">
              Перенаправление на панель управления...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};