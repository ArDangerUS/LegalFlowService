import React, { useState } from 'react';
import {User, Office, UserRole} from '../../types/user';
import { AuthService } from '../../services/AuthService';
import { InvitationModal } from '../InvitationModal';
import { PendingInvitations } from '../PendingInvitations';
import { useInvitations } from '../../hooks/useInvitations';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  offices: Office[];
  onUserUpdate: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  users,
  offices,
  onUserUpdate
}) => {
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const {
    invitations,
    createInvitation,
    resendInvitation,
    deleteInvitation,
  } = useInvitations();

  // Проверяем права на управление пользователями
  const canManageUsers = AuthService.canUserPerformAction(
    currentUser,
    'manage_users',
    'users'
  );

  const canCreateInvitations = AuthService.canUserPerformAction(
    currentUser,
    'create_invitation',
    'invitations'
  );

  // Фильтруем пользователей в зависимости от роли
  const visibleUsers = (users || []).filter(user => {
    if (currentUser.role === 'admin') {
      return true; // Админ видит всех
    }
    if (currentUser.role === 'office_admin') {
      return user.officeId === currentUser.officeId; // Админ офиса видит только своих
    }
    return user.officeId === currentUser.officeId; // Юристы видят коллег по офису
  });

  const handleSendInvitation = async (data: {
    email: string;
    role:   UserRole;
    officeId?: string;
  }) => {
    await createInvitation(data);
    // Можно показать уведомление об успехе
  };

  if (!canManageUsers && !canCreateInvitations) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-4">🔒</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Доступ ограничен
          </h3>
          <p className="text-gray-500">
            У вас нет прав для управления пользователями.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка приглашения */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Управление пользователями
          </h1>
          <p className="text-gray-600 mt-1">
            {currentUser.role === 'admin'
              ? 'Управление всеми пользователями системы'
              : 'Управление пользователями вашего офиса'
            }
          </p>
        </div>

        {canCreateInvitations && (
          <button
            onClick={() => setShowInvitationModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>+</span>
            <span>Пригласить пользователя</span>
          </button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Всего пользователей</p>
              <p className="text-2xl font-bold text-gray-900">{visibleUsers.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              👥
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Активных</p>
              <p className="text-2xl font-bold text-green-600">
                {visibleUsers.filter(u => u.isActive).length}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              ✅
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Юристов</p>
              <p className="text-2xl font-bold text-blue-600">
                {visibleUsers.filter(u => u.role === 'lawyer').length}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              ⚖️
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ожидающих</p>
              <p className="text-2xl font-bold text-orange-600">
                {invitations.length}
              </p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              ⏳
            </div>
          </div>
        </div>
      </div>

      {/* Ожидающие приглашения */}
      <PendingInvitations
        invitations={invitations}
        currentUser={currentUser}
        onResendInvitation={resendInvitation}
        onDeleteInvitation={deleteInvitation}
      />

      {/* Таблица пользователей */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Пользователи ({visibleUsers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Офис
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Последний вход
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'office_admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'lawyer' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'admin' && 'Администратор'}
                      {user.role === 'office_admin' && 'Админ офиса'}
                      {user.role === 'lawyer' && 'Юрист'}
                      {user.role === 'client' && 'Клиент'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {offices.find(o => o.id === user.officeId)?.name || 'Не назначен'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString('ru-RU')
                      : 'Никогда'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canManageUsers && (
                      <button className="text-blue-600 hover:text-blue-900">
                        Редактировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно приглашения */}
      <InvitationModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        onSuccess={(message) => {
        setShowInvitationModal(false);
        onUserUpdate(); // Обновляем список пользователей
        if (message) {
        // Можно использовать toast или alert
        console.log('✅', message);
        // toast.success(message);
      }
    }}
  currentUser={currentUser}
/>
    </div>
  );
};

export { UserManagement as default };