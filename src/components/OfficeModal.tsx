// components/OfficeModal.tsx - Модалка для создания/редактирования офиса

import React, { useState, useEffect } from 'react';

interface Office {
  id?: string;
  name: string;
  address?: string;
  city: string;
  phone?: string;
  email?: string;
}

interface OfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  office?: Office | null; // null для создания, объект для редактирования
}

export const OfficeModal: React.FC<OfficeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  office
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = Boolean(office?.id);

  // Заполняем форму при редактировании
  useEffect(() => {
    if (office) {
      setFormData({
        name: office.name || '',
        address: office.address || '',
        city: office.city || '',
        phone: office.phone || '',
        email: office.email || ''
      });
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        phone: '',
        email: ''
      });
    }
    setError('');
  }, [office, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Проверяем обязательные поля
      if (!formData.name.trim() || !formData.city.trim()) {
        throw new Error('Название и город обязательны для заполнения');
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Не найден токен авторизации');
      }

      const url = isEditMode ? `/api/offices/${office!.id}` : '/api/offices';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          city: formData.city.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка ${isEditMode ? 'обновления' : 'создания'} офиса`);
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Ошибка ${isEditMode ? 'обновления' : 'создания'} офиса`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      phone: '',
      email: ''
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
            {isEditMode ? 'Редактировать офис' : 'Создать офис'}
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
          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название офиса *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: Офис в центре"
              required
              disabled={isLoading}
            />
          </div>

          {/* Город */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Город *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: Киев"
              required
              disabled={isLoading}
            />
          </div>

          {/* Адрес */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Адрес
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: вул. Хрещатик, 1"
              disabled={isLoading}
            />
          </div>

          {/* Телефон */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Телефон
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: +380 44 123 45 67"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: office@company.com"
              disabled={isLoading}
            />
          </div>

          {/* Информация */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>Информация:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>Поля с * обязательны для заполнения</li>
                <li>После создания офиса вы сможете приглашать в него пользователей</li>
                <li>Название и город будут отображаться в списке офисов</li>
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
              disabled={isLoading}
            >
              {isLoading ?
                (isEditMode ? 'Обновление...' : 'Создание...') :
                (isEditMode ? 'Обновить офис' : 'Создать офис')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};