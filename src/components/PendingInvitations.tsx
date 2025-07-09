import React from 'react';
import { Invitation, User } from '../types/user';
import { AuthService } from '../services/AuthService';

interface PendingInvitationsProps {
  invitations: Invitation[];
  currentUser: User;
  onResendInvitation: (invitationId: string) => Promise<void>;
  onDeleteInvitation: (invitationId: string) => Promise<void>;
}

export const PendingInvitations: React.FC<PendingInvitationsProps> = ({
  invitations,
  currentUser,
  onResendInvitation,
  onDeleteInvitation
}) => {
  // Фильтруем приглашения в зависимости от роли
  const visibleInvitations = invitations.filter(invitation => {
    if (currentUser.role === 'admin') {
      return true; // Админ видит все
    }
    if (currentUser.role === 'office_admin') {
      return invitation.officeId === currentUser.officeId; // Админ офиса видит только свой офис
    }
    return false; // Юристы не видят приглашения
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'office_admin': return 'bg-purple-100 text-purple-800';
      case 'lawyer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (visibleInvitations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Ожидающие приглашения
        </h3>
        <p className="text-gray-500">Нет ожидающих приглашений</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Ожидающие приглашения ({visibleInvitations.length})
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Пользователи, которые были приглашены, но еще не зарегистрировались
        </p>
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
                Отправлено
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Истекает
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleInvitations.map((invitation) => (
              <tr key={invitation.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      Приглашен: {invitation.inviterName}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                    {invitation.role === 'admin' && 'Администратор'}
                    {invitation.role === 'office_admin' && 'Админ офиса'}
                    {invitation.role === 'lawyer' && 'Юрист'}
                    {invitation.role === 'client' && 'Клиент'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invitation.officeName || 'Не указан'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(invitation.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className={`flex items-center ${isExpired(invitation.expiresAt) ? 'text-red-600' : ''}`}>
                    {isExpired(invitation.expiresAt) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 mr-2">
                        Истекло
                      </span>
                    )}
                    {formatDate(invitation.expiresAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onResendInvitation(invitation.id)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                      title="Отправить повторно"
                    >
                      Повторно
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить это приглашение?')) {
                          onDeleteInvitation(invitation.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900 text-sm"
                      title="Удалить"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};