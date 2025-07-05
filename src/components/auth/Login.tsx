import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister?: (email: string, name: string, password: string) => Promise<void>;
  hasUsers?: boolean;
  loading?: boolean;
  error?: string | null;
}

export default function Login({ 
  onLogin, 
  onRegister, 
  hasUsers = true, 
  loading = false, 
  error 
}: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name validation for registration
    if (isRegistering && !formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (isRegistering && formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || loading) {
      return;
    }

    try {
      if (isRegistering && onRegister) {
        await onRegister(formData.email.trim(), formData.name.trim(), formData.password);
      } else {
        await onLogin(formData.email.trim(), formData.password);
      }
    } catch (err) {
      // Error handling is done in the parent component
      console.error('Login failed:', err);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setFormData({ name: '', email: '', password: '' });
    setValidationErrors({});
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">LegalFlow</h1>
          <p className="text-gray-600">
            {isRegistering 
              ? 'Create your legal workspace' 
              : 'Secure Legal Case Management System'}
          </p>
          {isRegistering && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Create an admin account for your legal workspace.
              </p>
            </div>
          )}
        </div>

        {/* Login/Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Global Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Name Field (only for registration) */}
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                  disabled={loading}
                  autoComplete="name"
                  required
                />
              </div>
              {validationErrors.name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
              )}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`pl-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>
            {validationErrors.email && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`pl-10 pr-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isRegistering ? 'Creating Account...' : 'Signing in...'}</span>
              </div>
            ) : (
              isRegistering ? 'Create Admin Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Toggle between Login and Registration */}
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {isRegistering 
              ? 'Already have an account? Sign in instead' 
              : 'Need to create a workspace? Register as admin'
            }
          </button>
        </div>
        {/* Footer */}
        <div className="mt-8 text-center">
          {!isRegistering ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Invite-Only Access</h3>
              <p className="text-xs text-blue-700">
                This system uses invite-only registration. Contact your administrator to request access.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-900 mb-2">Admin Registration</h3>
              <p className="text-xs text-green-700">
                Create an admin account to set up your legal workspace. After registration, you can invite team members.
              </p>
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>Secure authentication powered by Supabase</p>
            <p>All data is encrypted and protected</p>
          </div>
        </div>
      </div>
    </div>
  );
}