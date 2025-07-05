import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConfigured: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export default function ConnectionStatus({ 
  isConnected, 
  isConfigured, 
  error, 
  onRetry,
  className = '' 
}: ConnectionStatusProps) {
  if (!isConfigured) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <span className="text-sm text-yellow-700">Not configured</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <WifiOff className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-700">Disconnected</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <CheckCircle className="h-4 w-4 text-green-500" />
      <span className="text-sm text-green-700">Connected</span>
    </div>
  );
}