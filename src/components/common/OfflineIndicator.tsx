import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Database, RefreshCw } from 'lucide-react';
import { networkService } from '../../services/NetworkService';
import { offlineService } from '../../services/OfflineService';

interface OfflineIndicatorProps {
  onRetry?: () => void;
}

export default function OfflineIndicator({ onRetry }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(networkService.getConnectionStatus());
  const [isOfflineMode, setIsOfflineMode] = useState(offlineService.getOfflineMode());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = networkService.addListener(setIsOnline);
    
    // Check offline mode periodically
    const interval = setInterval(() => {
      setIsOfflineMode(offlineService.getOfflineMode());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (isOnline && !isOfflineMode) {
    return null; // Don't show indicator when everything is working
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`bg-white border rounded-lg shadow-lg p-3 cursor-pointer transition-all ${
          isOfflineMode ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Database className="h-4 w-4 text-orange-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <div className="text-sm">
            <div className={`font-medium ${isOfflineMode ? 'text-orange-800' : 'text-red-800'}`}>
              {isOnline ? 'Offline Mode' : 'No Connection'}
            </div>
            <div className={`text-xs ${isOfflineMode ? 'text-orange-600' : 'text-red-600'}`}>
              {isOnline ? 'Using cached data' : 'Check your connection'}
            </div>
          </div>
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className={`p-1 rounded hover:bg-white/50 ${
                isOfflineMode ? 'text-orange-600' : 'text-red-600'
              }`}
              title="Retry connection"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>

        {showDetails && (
          <div className={`mt-2 text-xs space-y-1 ${
            isOfflineMode ? 'text-orange-700' : 'text-red-700'
          }`}>
            <div>• Using locally cached data</div>
            <div>• Some features may be limited</div>
            <div>• Changes will sync when online</div>
          </div>
        )}
      </div>
    </div>
  );
}