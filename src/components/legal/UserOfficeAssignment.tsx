import React, { useState, useEffect } from 'react';
import { Users, Building2, ArrowRight, Check, X } from 'lucide-react';
import { LegalCaseService } from '../../services/LegalCaseService';
import type { User, Office } from '../../types/legal';

interface UserOfficeAssignmentProps {
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserOfficeAssignment({ onClose, onUpdate }: UserOfficeAssignmentProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<{ [userId: string]: string | null }>({});

  const caseService = new LegalCaseService();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, officesData] = await Promise.all([
        caseService.getUsers(),
        caseService.getOffices()
      ]);

      setUsers(usersData);
      setOffices(officesData);

      // Инициализируем текущие назначения
      const currentAssignments: { [userId: string]: string | null } = {};
      usersData.forEach(user => {
        currentAssignments[user.id] = user.officeId || null;
      });
      setAssignments(currentAssignments);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentChange = (userId: string, officeId: string | null) => {
    setAssignments(prev => ({
      ...prev,
      [userId]: officeId
    }));
  };

  const saveAssignments = async () => {
    try {
      setSaving(true);

      // Найти измененные назначения
      const changes: Array<{ userId: string; officeId: string | null }> = [];

      users.forEach(user => {
        const currentOfficeId = user.officeId || null;
        const newOfficeId = assignments[user.id] || null;

        if (currentOfficeId !== newOfficeId) {
          changes.push({ userId: user.id, officeId: newOfficeId });
        }
      });

      // Применить изменения
      for (const change of changes) {
        await caseService.assignUserToOffice(change.userId, change.officeId);
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to save assignments:', error);
    } finally {
      setSaving(false);
    }
  };

  const getOfficeName = (officeId: string | null) => {
    if (!officeId) return 'Без офиса';
    const office = offices.find(o => o.id === officeId);
    return office?.name || 'Неизвестный офис';
  };

  const getUsersByOffice = (officeId: string | null) => {
    return users.filter(user => assignments[user.id] === officeId);
  };

  const hasChanges = () => {
    return users.some(user => {
      const currentOfficeId = user.officeId || null;
      const newOfficeId = assignments[user.id] || null;
      return currentOfficeId !== newOfficeId;
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Building2 className="h-6 w-6" />
            <span>Назначение пользователей в офисы</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
          {/* Список пользователей */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Пользователи ({users.length})</span>
              </h4>
            </div>
            <div className="overflow-y-auto h-full">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    selectedUser === user.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedUser(user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'lawyer' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getOfficeName(user.officeId)}
                        </span>
                      </div>
                    </div>
                    {assignments[user.id] !== (user.officeId || null) && (
                      <div className="flex items-center space-x-2 text-orange-500">
                        <ArrowRight className="h-4 w-4" />
                        <span className="text-xs">Изменено</span>
                      </div>
                    )}
                  </div>

                  {/* Выбор офиса для пользователя */}
                  <div className="mt-3">
                    <select
                      value={assignments[user.id] || ''}
                      onChange={(e) => handleAssignmentChange(user.id, e.target.value || null)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Без офиса</option>
                      {offices.map(office => (
                        <option key={office.id} value={office.id}>
                          {office.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Группировка по офисам */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Распределение по офисам</span>
              </h4>
            </div>
            <div className="overflow-y-auto h-full p-4 space-y-4">
              {/* Без офиса */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-700">Без офиса</h5>
                  <span className="text-sm text-gray-500">
                    {getUsersByOffice(null).length} чел.
                  </span>
                </div>
                <div className="space-y-1">
                  {getUsersByOffice(null).map(user => (
                    <div key={user.id} className="text-sm text-gray-600 flex items-center justify-between">
                      <span>{user.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'lawyer' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Офисы */}
              {offices.map(office => {
                const officeUsers = getUsersByOffice(office.id);
                return (
                  <div key={office.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-700">{office.name}</h5>
                      <span className="text-sm text-gray-500">
                        {officeUsers.length} чел.
                      </span>
                    </div>
                    {office.address && (
                      <p className="text-xs text-gray-500 mb-2">{office.address}</p>
                    )}
                    <div className="space-y-1">
                      {officeUsers.map(user => (
                        <div key={user.id} className="text-sm text-gray-600 flex items-center justify-between">
                          <span>{user.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'lawyer' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      ))}
                      {officeUsers.length === 0 && (
                        <div className="text-sm text-gray-400 italic">Нет сотрудников</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {hasChanges() ? (
              <span className="text-orange-600 flex items-center space-x-1">
                <ArrowRight className="h-4 w-4" />
                <span>Есть несохраненные изменения</span>
              </span>
            ) : (
              <span className="text-green-600 flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>Все назначения сохранены</span>
              </span>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={saveAssignments}
              disabled={!hasChanges() || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Сохранить изменения</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}