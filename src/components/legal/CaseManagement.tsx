import React, { useState, useEffect } from 'react';
import { t } from '../../localization';
import { 
  FileText, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  User,
  Calendar,
  MessageSquare,
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { LegalCaseService } from '../../services/LegalCaseService';
import type { Case, User as UserType } from '../../types/legal';

interface CaseManagementProps {
  currentUser: UserType;
}

export default function CaseManagement({ currentUser }: CaseManagementProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [lawyers, setLawyers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedLawyer: '',
    search: ''
  });
  const [closureReason, setClosureReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [satisfactionRating, setSatisfactionRating] = useState<number>(5);

  const caseService = new LegalCaseService();

  useEffect(() => {
    loadCases();
    loadLawyers();
  }, [filters]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const filterParams = {
        ...(filters.status && { status: filters.status }),
        ...(filters.assignedLawyer && { assignedLawyerId: filters.assignedLawyer }),
        ...(filters.priority && { priority: filters.priority })
      };
      
      // Use role-based filtering
      const casesData = await caseService.getCasesForUser(
        currentUser.id,
        currentUser.role,
        filterParams
      );
      
      // Apply search filter on client side
      let filteredCases = casesData;
      if (filters.search) {
        filteredCases = casesData.filter(c => 
          c.clientName.toLowerCase().includes(filters.search.toLowerCase()) ||
          c.caseType?.toLowerCase().includes(filters.search.toLowerCase()) ||
          c.clientContact?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      setCases(filteredCases);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLawyers = async () => {
    try {
      const users = await caseService.getUsers();
      setLawyers(users.filter(u => u.role === 'lawyer' || u.role === 'admin'));
    } catch (error) {
      console.error('Failed to load lawyers:', error);
    }
  };

  const handleAssignCase = async (lawyerId: string) => {
    if (!selectedCase) return;
    
    try {
      await caseService.assignCase(selectedCase.id, lawyerId, currentUser.id);
      setShowAssignModal(false);
      setSelectedCase(null);
      loadCases();
    } catch (error) {
      console.error('Failed to assign case:', error);
    }
  };

  const handleCloseCase = async () => {
    if (!selectedCase || !closureReason) return;
    
    try {
      await caseService.updateCaseStatus(
        selectedCase.id, 
        'closed', 
        currentUser.id, 
        closureReason,
        satisfactionRating
      );
      setShowCloseModal(false);
      setSelectedCase(null);
      setClosureReason('');
      setSatisfactionRating(5);
      loadCases();
    } catch (error) {
      console.error('Failed to close case:', error);
    }
  };

  const handleRejectCase = async () => {
    if (!selectedCase || !rejectionReason) return;
    
    try {
      await caseService.updateCaseStatus(
        selectedCase.id, 
        'rejected', 
        currentUser.id, 
        rejectionReason
      );
      setShowRejectModal(false);
      setSelectedCase(null);
      setRejectionReason('');
      loadCases();
    } catch (error) {
      console.error('Failed to reject case:', error);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm(t('cases.deleteConfirm'))) {
      return;
    }
    
    try {
      await caseService.deleteCase(caseId);
      loadCases();
    } catch (error) {
      console.error('Failed to delete case:', error);
    }
  };

  const getStatusIcon = (status: Case['status']) => {
    switch (status) {
      case 'new':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'assigned':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: Case['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatResponseTime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('cases.title')}</h1>
          <p className="text-gray-600 mt-1">{t('cases.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            {t('cases.totalCases')}: {cases.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.search')}</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder={t('cases.searchCases')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cases.status')}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('cases.allStatuses')}</option>
              <option value="new">{t('cases.statusNew')}</option>
              <option value="assigned">{t('cases.statusAssigned')}</option>
              <option value="in-progress">{t('cases.statusInProgress')}</option>
              <option value="closed">{t('cases.statusClosed')}</option>
              <option value="rejected">{t('cases.statusRejected')}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cases.priority')}</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('cases.allPriorities')}</option>
              <option value="urgent">{t('cases.priorityUrgent')}</option>
              <option value="high">{t('cases.priorityHigh')}</option>
              <option value="medium">{t('cases.priorityMedium')}</option>
              <option value="low">{t('cases.priorityLow')}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cases.assignedLawyer')}</label>
            <select
              value={filters.assignedLawyer}
              onChange={(e) => setFilters(prev => ({ ...prev, assignedLawyer: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('cases.allLawyers')}</option>
              <option value="unassigned">{t('cases.unassigned')}</option>
              {lawyers.map(lawyer => (
                <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', priority: '', assignedLawyer: '', search: '' })}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('cases.clearFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">{t('common.loading')} {t('navigation.cases').toLowerCase()}...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('cases.noCasesFound')}</h3>
            <p className="text-gray-500">{t('cases.noMatchingCases')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cases.client')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cases.caseType')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cases.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cases.priority')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cases.assignedLawyer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cases.responseTime')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cases.created')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cases.map((case_) => (
                  <tr key={case_.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{case_.clientName}</div>
                        <div className="text-sm text-gray-500">{case_.clientContact}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {case_.caseType || t('cases.generalInquiry')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(case_.status)}
                        <span className="text-sm text-gray-900">
                          {case_.status === 'new' ? t('cases.statusNew') :
                           case_.status === 'assigned' ? t('cases.statusAssigned') :
                           case_.status === 'in-progress' ? t('cases.statusInProgress') :
                           case_.status === 'closed' ? t('cases.statusClosed') :
                           t('cases.statusRejected')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(case_.priority)}`}>
                        {case_.priority === 'urgent' ? t('cases.priorityUrgent') :
                         case_.priority === 'high' ? t('cases.priorityHigh') :
                         case_.priority === 'medium' ? t('cases.priorityMedium') :
                         t('cases.priorityLow')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {case_.assignedLawyerName || t('cases.unassigned')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatResponseTime(case_.responseTimeMinutes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {case_.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {(currentUser.role === 'admin' || case_.assignedLawyerId === currentUser.id) && (
                          <>
                            {case_.status === 'new' && currentUser.role === 'admin' && (
                              <button
                                onClick={() => {
                                  setSelectedCase(case_);
                                  setShowAssignModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title={t('cases.assignCase')}
                              >
                                <User className="h-4 w-4" />
                              </button>
                            )}
                            
                            {(case_.status === 'assigned' || case_.status === 'in-progress') && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedCase(case_);
                                    setShowCloseModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                  title={t('cases.closeCase')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCase(case_);
                                    setShowRejectModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                  title={t('cases.rejectCase')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            
                            {currentUser.role === 'admin' && (
                              <button
                                onClick={() => handleDeleteCase(case_.id)}
                                className="text-red-600 hover:text-red-900"
                                title={t('cases.deleteCase')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Case Modal */}
      {showAssignModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('cases.assignCaseTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('cases.assignCaseText')} "{selectedCase.clientName}":
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="max-h-[40vh] overflow-y-auto pr-1">
                {lawyers.map(lawyer => (
                  <button
                    key={lawyer.id}
                    onClick={() => handleAssignCase(lawyer.id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="font-medium text-gray-900">{lawyer.name}</div>
                    <div className="text-sm text-gray-500">{lawyer.email}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedCase(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Case Modal */}
      {showCloseModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('cases.closeCaseTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('cases.closeCaseText')} "{selectedCase.clientName}":
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('cases.closureReason')}
                </label>
                <textarea
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder={t('cases.closureReasonPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('cases.clientSatisfactionRating')}
                </label>
                <select
                  value={satisfactionRating}
                  onChange={(e) => setSatisfactionRating(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>{t('cases.satisfactionExcellent')}</option>
                  <option value={4}>{t('cases.satisfactionGood')}</option>
                  <option value={3}>{t('cases.satisfactionAverage')}</option>
                  <option value={2}>{t('cases.satisfactionPoor')}</option>
                  <option value={1}>{t('cases.satisfactionVeryPoor')}</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setSelectedCase(null);
                  setClosureReason('');
                  setSatisfactionRating(5);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCloseCase}
                disabled={!closureReason.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
              >
                {t('cases.closeCase')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Case Modal */}
      {showRejectModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('cases.rejectCaseTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('cases.rejectCaseText')} "{selectedCase.clientName}":
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cases.rejectionReason')}
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('cases.rejectionReasonPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedCase(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRejectCase}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                {t('cases.rejectCase')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}