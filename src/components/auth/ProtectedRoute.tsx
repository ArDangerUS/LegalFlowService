import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import type { User } from '../../types/legal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: User['role'][];
  fallback?: React.ReactNode;
  showError?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback,
  showError = true 
}: ProtectedRouteProps) {
  const { user, loading, error, hasAnyRole } = useAuth();

  // Only show loading state if we don't have a user and we're actually loading
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading</h2>
          <p className="text-gray-600">Verifying your access...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && showError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page. Required roles: {requiredRoles.join(', ')}.
          </p>
          <p className="text-sm text-gray-500">
            Your current role: {user.role}
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and authorized
  return <>{children}</>;
}