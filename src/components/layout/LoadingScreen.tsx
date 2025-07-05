import React from 'react';
import { t } from '../../localization';
import LoadingSpinner from '../common/LoadingSpinner';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export default function LoadingScreen({ 
  message = t('app.initializing'), 
  subMessage = t('app.initializingSubtext') 
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{message}</h2>
        <p className="text-gray-600">{subMessage}</p>
      </div>
    </div>
  );
}