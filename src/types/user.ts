// src/types/user.ts - Полные типы для системы ролей

export type UserRole = 'admin' | 'office_admin' | 'lawyer' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  officeId?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Office {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  userCount?: number; // Для статистики
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  officeId?: string;
  officeName?: string;
  invitedBy: string;
  inviterName: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export interface UserPermission {
  role: UserRole;
  permission: string;
  resource: string;
  scope: 'all' | 'office' | 'own';
}

// Для совместимости со старыми типами, если они используются
export interface DatabaseUser extends User {
  office_id?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// Утилиты для работы с ролями
export const RoleUtils = {
  getDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      admin: 'Администратор',
      office_admin: 'Администратор офиса',
      lawyer: 'Юрист',
      client: 'Клиент'
    };
    return roleNames[role];
  },

  getRoleHierarchy(): UserRole[] {
    return ['admin', 'office_admin', 'lawyer', 'client'];
  },

  canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    if (managerRole === 'admin') return true;
    if (managerRole === 'office_admin') {
      return ['lawyer', 'client'].includes(targetRole);
    }
    return false;
  },

  getRoleColor(role: UserRole): string {
    const colors: Record<UserRole, string> = {
      admin: 'bg-red-100 text-red-800',
      office_admin: 'bg-purple-100 text-purple-800',
      lawyer: 'bg-blue-100 text-blue-800',
      client: 'bg-green-100 text-green-800'
    };
    return colors[role];
  },

  getRoleIcon(role: UserRole): string {
    const icons: Record<UserRole, string> = {
      admin: '👑',
      office_admin: '🏢',
      lawyer: '⚖️',
      client: '👤'
    };
    return icons[role];
  }
};