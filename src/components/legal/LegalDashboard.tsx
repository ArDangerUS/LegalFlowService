import React, { useState, useEffect } from 'react';
import { t } from '../../localization';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Bell, 
  Settings, 
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  Paperclip,
  Building2
} from 'lucide-react';
import CaseManagement from './CaseManagement';
import Analytics from './Analytics';
import UserManagement from './UserManagement';
import CaseAssignment from './CaseAssignment';
import LawyerCaseView from './LawyerCaseView';
import OfficeManagement from './OfficeManagement';
import TelegramBotInterface from '../TelegramBotInterface';
import { LegalCaseService } from '../../services/LegalCaseService';
import type { User, Case } from '../../types/legal';

interface LegalDashboardProps {
  currentUser: User;
  botToken: string;
  isConnected: boolean;
  isConfigured: boolean;
  telegramNotifications: Array<{
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
  }>;
  onTelegramNotificationRead: (id: string) => void;
  onClearTelegramNotifications: () => void;
}

export default function LegalDashboard({ 
  currentUser, 
  botToken, 
  isConnected,
  isConfigured,
  telegramNotifications,
  onTelegramNotificationRead,
  onClearTelegramNotifications
}: LegalDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalCases: 0,
    newRequests: 0,
    urgentCases: 0,
    unreadTelegramMessages: 0,
  });
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  const caseService = new LegalCaseService();

  useEffect(() => {
    if (isConnected) {
      loadDashboardData();
    }
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      if (isConnected) {
        loadDashboardData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser.id, isConnected]);

  // Update stats when telegram notifications change
  useEffect(() => {
    const unreadTelegram = telegramNotifications.filter(n => !n.isRead).length;
    setStats(prev => ({
      ...prev,
      unreadTelegramMessages: unreadTelegram
    }));
  }, [telegramNotifications]);



  const loadDashboardData = async () => {
    try {
      const cases = await caseService.getCases();

      const unreadTelegram = telegramNotifications.filter(n => !n.isRead).length;

      setStats({
        totalCases: cases.length,
        newRequests: cases.filter(c => c.status === 'new').length,
        urgentCases: cases.filter(c => c.priority === 'urgent').length,
        unreadTelegramMessages: unreadTelegram,
      });

      setRecentCases(cases.slice(0, 5));
    } catch (error) {
      console.warn('⚠️ Failed to load dashboard data, using cached/offline data:', error);
      // Dashboard will show cached data from the services
    } finally {
      setLoading(false);
    }
  };


  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('dashboard.welcomeBack')} {currentUser.name}</h2>
            <p className="text-blue-100 mt-1">
              {currentUser.role === 'admin' ? t('dashboard.systemAdmin') : t('dashboard.legalProfessional')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-200" />
            <span className="text-sm text-blue-200">LegalFlow System</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.totalCases')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCases}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.newRequests')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newRequests}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          {stats.newRequests > 0 && (
            <div className="mt-2">
              <span className="text-xs text-yellow-600 font-medium">{t('dashboard.requiresAttention')}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.unreadMessages')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unreadTelegramMessages}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          {stats.unreadTelegramMessages > 0 && (
            <div className="mt-2">
              <span className="text-xs text-blue-600 font-medium">{t('dashboard.unreadMessagesText')}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.urgentCases')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.urgentCases}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          {stats.urgentCases > 0 && (
            <div className="mt-2">
              <span className="text-xs text-orange-600 font-medium">{t('dashboard.highPriority')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('dashboard.recentCases')}</h3>
            <button
              onClick={() => setActiveTab('cases')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('ai.viewAll')} →
            </button>
          </div>
          
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : recentCases.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{t('dashboard.noRecentCases')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCases.map(case_ => (
                <div key={case_.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{case_.clientName}</h4>
                    <p className="text-xs text-gray-500">{case_.caseType || 'General Inquiry'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      case_.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                      case_.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      case_.status === 'closed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {case_.status === 'new' ? t('cases.statusNew') :
                       case_.status === 'assigned' ? t('cases.statusAssigned') :
                       case_.status === 'in-progress' ? t('cases.statusInProgress') :
                       case_.status === 'closed' ? t('cases.statusClosed') :
                       t('cases.statusRejected')}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {case_.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('dashboard.recentMessages')}</h3>
            <button
              onClick={() => setActiveTab('messages')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('ai.viewAll')} →
            </button>
          </div>
          
          {telegramNotifications.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{t('dashboard.noRecentMessages')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {telegramNotifications.slice(0, 3).map(notification => (
                <div key={notification.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{notification.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {notification.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard.quickActions')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('cases')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-blue-500" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">{t('dashboard.manageCases')}</div>
              <div className="text-xs text-gray-500">{t('dashboard.manageCasesDesc')}</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-green-500" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">{t('dashboard.viewAnalytics')}</div>
              <div className="text-xs text-gray-500">{t('dashboard.performanceInsights')}</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('messages')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">{t('navigation.messages')}</div>
              <div className="text-xs text-gray-500">{t('dashboard.telegramConversations')}</div>
            </div>
          </button>
          

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-purple-500" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{t('dashboard.manageUsers')}</div>
                  <div className="text-xs text-gray-500">{t('dashboard.userAdministration')}</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('offices')}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Building2 className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Управление офисами</div>
                  <div className="text-xs text-gray-500">Создание и управление офисами</div>
                </div>
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'overview', name: t('navigation.overview'), icon: BarChart3 },
            ...(currentUser.role === 'admin' ? [
              { id: 'cases', name: t('navigation.cases'), icon: FileText },
              { id: 'assignment', name: 'Case Assignment', icon: Users }
            ] : [
              { id: 'mycases', name: 'My Cases', icon: FileText }
            ]),
            { id: 'analytics', name: t('navigation.analytics'), icon: BarChart3 },
            { id: 'messages', name: t('navigation.messages'), icon: MessageSquare },
            ...(currentUser.role === 'admin' ? [{ id: 'users', name: t('navigation.users'), icon: Users },
            { id: 'offices', name: t('navigation.offices'), icon: Building2 }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
              {tab.id === 'messages' && stats.unreadTelegramMessages > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.unreadTelegramMessages > 99 ? '99+' : stats.unreadTelegramMessages}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Overview Tab */}
        <div className={activeTab === 'overview' ? '' : 'hidden'}>
          {renderOverview()}
        </div>

        {/* Cases Tab */}
        <div className={activeTab === 'cases' ? '' : 'hidden'}>
          <CaseManagement currentUser={currentUser} />
        </div>

        {/* Case Assignment Tab (Admin Only) */}
        <div className={activeTab === 'assignment' ? '' : 'hidden'}>
          <CaseAssignment currentUser={currentUser} />
        </div>

        {/* My Cases Tab (Lawyers) */}
        <div className={activeTab === 'mycases' ? '' : 'hidden'}>
          <LawyerCaseView currentUser={currentUser} botToken={botToken} />
        </div>

        {/* Analytics Tab */}
        <div className={activeTab === 'analytics' ? '' : 'hidden'}>
          <Analytics currentUser={currentUser} />
        </div>

        {/* Messages Tab */}
        <div className={activeTab === 'messages' ? '' : 'hidden'}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Telegram Bot Messages</h1>
                <p className="text-gray-600 mt-1">Real-time communication with clients through Telegram</p>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-700">Real-time enabled</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">End-to-end secured</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[calc(100vh-280px)] relative overflow-hidden">
              <TelegramBotInterface 
                botToken={botToken} 
                currentUser={currentUser}
              />
            </div>
            
          </div>
        </div>

        {/* Users Tab */}
        {currentUser.role === 'admin' && (
          <div className={activeTab === 'users' ? '' : 'hidden'}>
            <UserManagement currentUser={currentUser} />
          </div>
        )}
        {currentUser.role === 'admin' && (
          <div className={activeTab === 'offices' ? '' : 'hidden'}>
            <OfficeManagement />
          </div>
        )}
      </main>
    </div>
  );
}