// components/InvitationModal.tsx - Исправленная модалка приглашений

import React, { useState, useEffect } from 'react';
import { UserRole } from '../types/user';
import { InvitationService } from '../services/invitationService';

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
  onSuccess: () => void;
  currentUserRole: UserRole;
  currentUserOfficeId?: string;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUserRole,
  currentUserOfficeId
}) => {
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

  // Определяем доступные роли в зависимости от роли текущего пользователя
  useEffect(() => {
    const roles: UserRole[] = [];

    if (currentUserRole === 'admin') {
      roles.push('admin', 'office_admin', 'lawyer', 'client');
    } else if (currentUserRole === 'office_admin') {
      roles.push('office_admin', 'lawyer', 'client');
    }

    setAvailableRoles(roles);

    // Устанавливаем роль по умолчанию
    if (roles.length > 0) {
      const defaultRole = currentUserRole === 'admin' ? 'lawyer' : 'lawyer';
      setFormData(prev => ({ ...prev, role: defaultRole }));
    }
  }, [currentUserRole]);

  // Загружаем офисы при открытии модалки
  useEffect(() => {
    if (isOpen) {
      loadOffices();
    }
  }, [isOpen, currentUserRole, currentUserOfficeId]);

  const loadOffices = async () => {
    setIsLoadingOffices(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Не найден токен авторизации');
      }

      const response = await fetch('/api/offices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки офисов');
      }

      const offices = await response.json();
      setAvailableOffices(offices);

      // Автоматически выбираем офис
      if (offices.length === 1) {
        setFormData(prev => ({ ...prev, officeId: offices[0].id }));
      } else if (currentUserRole === 'office_admin' && currentUserOfficeId) {
        // Админ офиса может приглашать только в свой офис
        const userOffice = offices.find(office => office.id === currentUserOfficeId);
        if (userOffice) {
          setFormData(prev => ({ ...prev, officeId: userOffice.id }));
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки офисов:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки офисов');
    } finally {
      setIsLoadingOffices(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Проверяем обязательные поля
      if (!formData.email || !formData.role) {
        throw new Error('Заполните все обязательные поля');
      }

      if (availableOffices.length > 1 && !formData.officeId) {
        throw new Error('Выберите офис');
      }

      await InvitationService.createInvitation({
        email: formData.email,
        role: formData.role,
        officeId: formData.officeId || undefined
      });

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки приглашения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      role: availableRoles[0] || 'lawyer',
      officeId: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Пригласить пользователя
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@example.com"
              required
              disabled={isLoading}
            />
          </div>

          {/* Роль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Роль *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            >
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {role === 'admin' && 'Администратор'}
                  {role === 'office_admin' && 'Админ офиса'}
                  {role === 'lawyer' && 'Юрист'}
                  {role === 'client' && 'Клиент'}
                </option>
              ))}
            </select>
          </div>

          {/* Офис */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Офис {availableOffices.length > 1 && '*'}
            </label>
            {isLoadingOffices ? (
              <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded-lg">
                Загрузка офисов...
              </div>
            ) : availableOffices.length === 0 ? (
              <div className="text-sm text-red-600 p-2 bg-red-50 rounded-lg">
                Нет доступных офисов для приглашения
              </div>
            ) : availableOffices.length === 1 ? (
              <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded-lg">
                {availableOffices[0].name} ({availableOffices[0].city})
              </div>
            ) : (
              <select
                value={formData.officeId}
                onChange={(e) => setFormData(prev => ({ ...prev, officeId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
              >
                <option value="">Выберите офис</option>
                {availableOffices.map(office => (
                  <option key={office.id} value={office.id}>
                    {office.name} ({office.city})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Информация о правах роли */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>Права выбранной роли:</strong>
              <ul className="mt-1 ml-4 list-disc">
                {formData.role === 'admin' && (
                  <>
                    <li>Полный доступ ко всем офисам и функциям</li>
                    <li>Создание и управление офисами</li>
                    <li>Управление всеми пользователями</li>
                  </>
                )}
                {formData.role === 'office_admin' && (
                  <>
                    <li>Управление пользователями своего офиса</li>
                    <li>Назначение дел юристам</li>
                    <li>Просмотр всех дел офиса</li>
                    <li>Приглашение новых сотрудников в офис</li>
                  </>
                )}
                {formData.role === 'lawyer' && (
                  <>
                    <li>Работа с назначенными делами</li>
                    <li>Просмотр переписок своего офиса</li>
                    <li>Ответы на сообщения клиентов</li>
                  </>
                )}
                {formData.role === 'client' && (
                  <>
                    <li>Базовый доступ к системе</li>
                    <li>Просмотр своих дел</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading || availableOffices.length === 0 || isLoadingOffices}
            >
              {isLoading ? 'Отправка...' : 'Отправить приглашение'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};