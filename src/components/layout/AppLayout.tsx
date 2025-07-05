import React from 'react';
import { Shield, Users, LogOut, MessageSquare } from 'lucide-react';
import { t } from '../../localization';
import ConnectionStatus from '../common/ConnectionStatus';
import type { User } from '../../types/legal';

interface AppLayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout?: () => void;
  isConnected?: boolean;
  isConfigured?: boolean;
  onRetryConnection?: () => void;
}

export default function AppLayout({ 
  children, 
  currentUser, 
  onLogout,
  isConnected = true, 
  isConfigured = true,
  onRetryConnection 
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">LegalFlow</span>
              <span className="text-sm text-gray-500">- {t('app.subtitle')}</span>
            </div>
            
            <ConnectionStatus
              isConnected={isConnected}
              isConfigured={isConfigured}
              onRetry={onRetryConnection}
              className="ml-4"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gray-100 rounded-full">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {currentUser.role === 'admin' ? t('users.admin') : 
                   currentUser.role === 'lawyer' ? t('users.lawyer') : 
                   t('users.client')}
                </div>
              </div>
            </div>
            
            {/* Notification Badge */}
            <div className="relative">
              <div className="p-2 bg-gray-100 rounded-full">
                <MessageSquare className="h-4 w-4 text-gray-600" />
              </div>
              {/* This will be updated by the global notification system */}
            </div>
            
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}