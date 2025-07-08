// src/components/InvitationModal.tsx - Исправленная версия без бесконечного цикла

import React, { useState, useEffect, useMemo } from 'react';
import { User, Office, UserRole } from '../types/user';
import { AuthService } from '../services/AuthService';

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvitation: (data: {
    email: string;
    role: UserRole;
    officeId?: string;
  }) => Promise<void>;
  currentUser: User;
  offices: Office[];
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
  onSendInvitation,
  currentUser,
  offices = []
}) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'lawyer' as UserRole,
    officeId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Используем useMemo для предотвращения пересоздания массивов на каждом рендере
  const availableRoles = useMemo(() => {
    if (!currentUser?.role) return [];
    return AuthService.getAvailableRolesForInvitation(currentUser.role) || [];
  }, [currentUser?.role]);

  const availableOffices = useMemo(() => {
    if (!currentUser || !offices) return [];
    return AuthService.getAvailableOfficesForInvitation(currentUser, offices) || [];
  }, [currentUser, offices]);

  // Мемоизируем значения для useEffect
  const defaultRole = useMemo(() => {
    return (availableRoles && availableRoles.length > 0) ? availableRoles[0] : 'lawyer';
  }, [availableRoles]);

  const defaultOfficeId = useMemo(() => {
    return (availableOffices && availableOffices.length === 1) ? availableOffices[0].id : '';
  }, [availableOffices]);

  useEffect(() => {
    if (isOpen) {
      // Сброс формы при открытии
      setFormData({
        email: '',
        role: defaultRole,
        officeId: defaultOfficeId
      });
      setError('');
    }
  }, [isOpen, defaultRole, defaultOfficeId]); // Используем мемоизированные значения

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await onSendInvitation({
        email: formData.email,
        role: formData.role,
        officeId: formData.officeId || undefined
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки приглашения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      role: defaultRole,
      officeId: defaultOfficeId
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Роль *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Офис {availableOffices.length > 1 && '*'}
            </label>
            {availableOffices.length === 0 ? (
              <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded-lg">
                Нет доступных офисов для приглашения
              </div>
            ) : availableOffices.length === 1 ? (
              <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded-lg">
                {availableOffices[0]?.name || 'Офис без названия'}
              </div>
            ) : (
              <select
                value={formData.officeId}
                onChange={(e) => setFormData(prev => ({ ...prev, officeId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Выберите офис</option>
                {availableOffices.map(office => (
                  <option key={office.id} value={office.id}>
                    {office.name}
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
              disabled={isLoading || availableOffices.length === 0}
            >
              {isLoading ? 'Отправка...' : 'Отправить приглашение'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};