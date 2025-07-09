import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingScreen from './components/layout/LoadingScreen';
import OfflineIndicator from './components/common/OfflineIndicator';
import AppLayout from './components/layout/AppLayout';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LegalDashboard from './components/legal/LegalDashboard';
import TelegramBotInterface from './components/TelegramBotInterface';
import { InvitationAcceptance } from './pages/InvitationAcceptance';
import { useAuth } from './hooks/useAuth';
import { useDatabase } from './hooks/useDatabase';
import { useNotifications } from './hooks/useNotifications';
import { networkService } from './services/NetworkService';
import { offlineService } from './services/OfflineService';
import { Shield, AlertTriangle } from 'lucide-react';

function App() {
  const {
    user: currentUser,
    loading: authLoading,
    error: authError,
    session,
    hasUsers,
    signIn,
    signOut,
    signUpFirstUser,
    initializeUser,
    clearError
  } = useAuth();

  const {
    isConnected,
    isConfigured,
    loading: dbLoading,
    error: dbError,
    retry: retryConnection
  } = useDatabase();

  const {
    notifications,
    addNotification,
    markAsRead,
    clearAll
  } = useNotifications();

  const botToken = "7242799466:AAEf-t8CSqzjOdVmVwWllns0ZVu7tvR_VD0";
  // const botToken = "7902383724:AAGosG9WLCEuBdXeZhKHP7Qj-P0gjkiWn30";

  // Handle new Telegram message notifications
  const handleTelegramNotification = (notification: {
    id: string;
    title: string;
    message: string;
    timestamp: Date;
  }) => {
    addNotification({
      title: notification.title,
      message: notification.message,
      type: 'info'
    });
  };

  const handleRetryConnection = async () => {
    // Reset offline mode to allow retry
    offlineService.setOfflineMode(false);
    await retryConnection();
    if (isConnected) {
      await initializeUser();
    }
  };

  const handleLogin = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleRegister = async (email: string, name: string, password: string) => {
    await signUpFirstUser(email, name, password);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading screen while initializing
  if (dbLoading || authLoading) {
    return <LoadingScreen />;
  }

  // Show database error screen if connection failed
  if (!isConnected || dbError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Database Connection Issue</h2>
          <p className="text-gray-600 mb-4">{dbError || 'Database connection failed'}</p>
          <button
            onClick={handleRetryConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Show login screen if no authenticated user - теперь через Router
  if (!currentUser && !authLoading) {
    return (
      <ErrorBoundary>
        <Router>
          <Routes>
            {/* Роут для приглашений доступен без авторизации */}
            <Route path="/invite/:token" element={<InvitationAcceptance />} />

            {/* Все остальные роуты ведут на страницу логина */}
            <Route path="*" element={
              <Login
                onLogin={handleLogin}
                onRegister={handleRegister}
                loading={authLoading}
                error={authError}
              />
            } />
          </Routes>
        </Router>
      </ErrorBoundary>
    );
  }

  // Show auth error if user initialization failed
  if (authError && !currentUser) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">{authError}</p>
            <div className="space-x-3">
              <button
                onClick={clearError}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={initializeUser}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Основное приложение с роутами
  return (
    <ErrorBoundary>
      <Router>
        <OfflineIndicator onRetry={handleRetryConnection} />

        <Routes>
          {/* РОУТ ДЛЯ ПРИГЛАШЕНИЙ - доступен без авторизации */}
          <Route path="/invite/:token" element={<InvitationAcceptance />} />

          {/* Роут для логина */}
          <Route
            path="/login"
            element={
              currentUser ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  loading={authLoading}
                  error={authError}
                />
              )
            }
          />

          {/* Защищенные роуты */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <AppLayout
                  currentUser={currentUser!}
                  onLogout={handleLogout}
                  isConnected={isConnected}
                  isConfigured={isConfigured}
                  onRetryConnection={handleRetryConnection}
                >
                  {/* Hidden Telegram Bot Instance - runs globally in background */}
                  <div className="hidden">
                    <TelegramBotInterface
                      botToken={botToken}
                      onNotification={handleTelegramNotification}
                      runInBackground={true}
                    />
                  </div>

                  <LegalDashboard
                    currentUser={currentUser!}
                    botToken={botToken}
                    isConnected={isConnected}
                    isConfigured={isConfigured}
                    telegramNotifications={notifications}
                    onTelegramNotificationRead={markAsRead}
                    onClearTelegramNotifications={clearAll}
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Главная страница - редирект */}
          <Route
            path="/"
            element={
              currentUser ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Остальные пути - редирект */}
          <Route
            path="*"
            element={
              currentUser ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;