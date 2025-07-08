// src/components/InvitationModal.tsx - Исправленная модалка приглашений

import React, { useState, useEffect } from 'react';
import { UserRole } from '../types/user';
import { invitationApi, apiClient } from '../lib/apiClient';

interface Office {
  id: string;
  name: string;
  address?: string;
  city: string;
  phone?: string;
  email?: string;
}

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  currentUserRole: UserRole;
  currentUserOfficeId?: string;
  // Альтернативные имена пропсов для совместимости
  currentUser?: { role: UserRole; officeId?: string };
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUserRole,
  currentUserOfficeId,
  currentUser // альтернативный проп
}) => {
  // Определяем роль и офис из разных источников
  const userRole = currentUserRole || currentUser?.role || 'lawyer';
  const userOfficeId = currentUserOfficeId || currentUser?.officeId;
  const [formData, setFormData] = useState({
    email: '',
    role: 'lawyer' as UserRole,
    officeId: ''
  });
  const [availableOffices, setAvailableOffices] = useState<Office[]>([]);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOffices, setIsLoadingOffices] = useState(false);
  const [error, setError] = useState('');

  // Отладочная информация
  useEffect(() => {
    console.log('🔍 InvitationModal props:', {
      isOpen,
      currentUserRole,
      currentUserOfficeId,
      currentUser,
      userRole,
      userOfficeId,
      availableRoles: availableRoles.length,
      formData
    });
  }, [isOpen, currentUserRole, currentUserOfficeId, currentUser, userRole, userOfficeId, availableRoles, formData]);

  // Определяем доступные роли в зависимости от роли текущего пользователя
  useEffect(() => {
    console.log('🔑 Setting up available roles for user role:', userRole);

    const roles: UserRole[] = [];

    if (userRole === 'admin') {
      roles.push('admin', 'office_admin', 'lawyer', 'client');
    } else if (userRole === 'office_admin') {
      roles.push('office_admin', 'lawyer', 'client');
    } else {
      // Если роль не определена или неизвестна, добавляем базовые роли
      roles.push('lawyer', 'client');
    }

    console.log('📋 Available roles:', roles);
    setAvailableRoles(roles);

    // Устанавливаем роль по умолчанию
    if (roles.length > 0) {
      const defaultRole = roles.includes('lawyer') ? 'lawyer' : roles[0];
      console.log('🎯 Setting default role:', defaultRole);
      setFormData(prev => ({ ...prev, role: defaultRole }));
    }
  }, [userRole]);

  // Загружаем офисы при открытии модалки
  useEffect(() => {
    if (isOpen) {
      loadOffices();
    }
  }, [isOpen, userRole, userOfficeId]);

  // Сброс формы при закрытии
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: '',
        role: 'lawyer',
        officeId: ''
      });
      setError('');
    }
  }, [isOpen]);

  const loadOffices = async () => {
    setIsLoadingOffices(true);
    setError('');

    try {
      // Определяем правильный URL для API
      const apiBaseUrl = window.location.port === '5173' || window.location.port === '3001'
        ? 'http://localhost:3000'
        : '';

      // Сначала проверяем доступность API напрямую
      console.log('🔍 Проверяем доступность API...');

      const healthResponse = await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Health response status:', healthResponse.status);
      console.log('Health response headers:', Object.fromEntries(healthResponse.headers.entries()));

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
      }

      const contentType = healthResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`API вернул неправильный content-type: ${contentType}. Проверьте, что API сервер запущен на порту 3000.`);
      }

      const healthData = await healthResponse.json();
      console.log('✅ API Health check passed:', healthData);

      // Теперь загружаем офисы через apiClient
      console.log('🏢 Загружаем офисы...');
      const offices = await apiClient.get<Office[]>('/offices');
      console.log('✅ Offices loaded:', offices);
      setAvailableOffices(offices || []);

      // Автоматически выбираем офис
      if (offices && offices.length === 1) {
        setFormData(prev => ({ ...prev, officeId: offices[0].id }));
      } else if (userRole === 'office_admin' && userOfficeId) {
        // Админ офиса может приглашать только в свой офис
        const userOffice = offices?.find(office => office.id === userOfficeId);
        if (userOffice) {
          setFormData(prev => ({ ...prev, officeId: userOffice.id }));
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки офисов:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки офисов';
      setError(errorMessage);

      // Если это проблема с сетью, предлагаем решение
      if (errorMessage.includes('Network error')) {
        setError('Проблема с подключением к серверу. Убедитесь, что сервер запущен на порту 3000.');
      }
    } finally {
      setIsLoadingOffices(false);
    }
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      throw new Error('Email обязательно для заполнения');
    }

    if (!formData.email.includes('@')) {
      throw new Error('Введите корректный email адрес');
    }

    if (!formData.role) {
      throw new Error('Выберите роль для пользователя');
    }

    // Офис обязателен только если их больше 1
    if (availableOffices.length > 1 && !formData.officeId) {
      throw new Error('Выберите офис для пользователя');
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      validateForm();

      const invitationData = {
        email: formData.email.trim(),
        role: formData.role,
        officeId: formData.officeId || (availableOffices.length === 1 ? availableOffices[0].id : undefined)
      };

      console.log('Отправка приглашения:', invitationData);

      const result = await invitationApi.create(invitationData);

      console.log('Приглашение создано:', result);

      onSuccess(`Приглашение отправлено на ${formData.email}`);
      handleClose();
    } catch (err) {
      console.error('Ошибка создания приглашения:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка создания приглашения';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    const roleNames = {
      admin: 'Администратор',
      office_admin: 'Администратор офиса',
      lawyer: 'Юрист',
      client: 'Клиент'
    };
    return roleNames[role] || role;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Пригласить пользователя
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email приглашения *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Роль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Роль для приглашенного пользователя *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 bg-white"
            >
              {availableRoles.length === 0 ? (
                <option value="">Загрузка ролей...</option>
              ) : (
                availableRoles.map(role => (
                  <option key={role} value={role}>
                    {getRoleDisplayName(role)}
                  </option>
                ))
              )}
            </select>
            {availableRoles.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                Нет доступных ролей для выбора
              </p>
            )}
          </div>

          {/* Офис */}
          {isLoadingOffices ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Загрузка офисов...</p>
            </div>
          ) : availableOffices.length > 1 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Офис *
              </label>
              <select
                value={formData.officeId}
                onChange={(e) => setFormData(prev => ({ ...prev, officeId: e.target.value }))}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Выберите офис...</option>
                {availableOffices.map(office => (
                  <option key={office.id} value={office.id}>
                    {office.name} ({office.city})
                  </option>
                ))}
              </select>
            </div>
          ) : availableOffices.length === 1 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Офис
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {availableOffices[0].name} ({availableOffices[0].city})
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Офис
              </label>
              <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                ⚠️ Офисы не настроены. Пользователь будет создан без привязки к офису.
              </div>
            </div>
          )}

          {/* Права выбранной роли */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Права выбранной роли:
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              {formData.role === 'admin' && (
                <ul className="list-disc list-inside space-y-1">
                  <li>Полный доступ ко всей системе</li>
                  <li>Управление всеми пользователями и офисами</li>
                  <li>Просмотр всех дел и аналитики</li>
                </ul>
              )}
              {formData.role === 'office_admin' && (
                <ul className="list-disc list-inside space-y-1">
                  <li>Управление пользователями своего офиса</li>
                  <li>Просмотр дел своего офиса</li>
                  <li>Создание приглашений в свой офис</li>
                </ul>
              )}
              {formData.role === 'lawyer' && (
                <ul className="list-disc list-inside space-y-1">
                  <li>Работа с назначенными делами</li>
                  <li>Обработка телеграм сообщений</li>
                  <li>Просмотр коллег по офису</li>
                </ul>
              )}
              {formData.role === 'client' && (
                <ul className="list-disc list-inside space-y-1">
                  <li>Просмотр своих дел</li>
                  <li>Общение с назначенными юристами</li>
                </ul>
              )}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading || isLoadingOffices}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Отправка...
                </>
              ) : (
                'Отправить приглашение'
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            После отправки приглашения пользователь получит email с ссылкой для регистрации.
            Приглашение действительно в течение 7 дней.
          </p>
        </div>
      </div>
    </div>
  );
};