import React, { useState, useEffect } from 'react';
import { t } from '../../localization';
import { 
  FileText, 
  MessageSquare, 
  Clock, 
  User,
  AlertTriangle, 
  CheckCircle,
  Shield,
  Eye,
  Calendar,
  Phone,
  Mail
} from 'lucide-react';
import { LegalCaseService } from '../../services/LegalCaseService';
import TelegramBotInterface from '../TelegramBotInterface';
import type { Case, User as UserType } from '../../types/legal';

interface LawyerCaseViewProps {
  currentUser: UserType;
  botToken: string;
}

export default function LawyerCaseView({ currentUser, botToken }: LawyerCaseViewProps) {
  const [assignedCases, setAssignedCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'communication'>('overview');

  const caseService = new LegalCaseService();

  useEffect(() => {
    loadAssignedCases();
  }, [currentUser.id]);

  const loadAssignedCases = async () => {
    try {
      setLoading(true);
      // Get cases assigned to this lawyer
      const cases = await caseService.getCasesForUser(
        currentUser.id,
        currentUser.role
      );
      setAssignedCases(cases);
      
      // Auto-select first case if available
      if (cases.length > 0 && !selectedCase) {
        setSelectedCase(cases[0]);
      }
    } catch (error) {
      console.error('Failed to load assigned cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCaseStatus = async (caseId: string, status: Case['status'], reason?: string) => {
    try {
      await caseService.updateCaseStatus(caseId, status, currentUser.id, reason);
      loadAssignedCases();
      
      // Update selected case if it's the one being updated
      if (selectedCase?.id === caseId) {
        const updatedCase = await caseService.getCaseById(caseId);
        if (updatedCase) {
          setSelectedCase(updatedCase);
        }
      }
    } catch (error) {
      console.error('Failed to update case status:', error);
      alert('Failed to update case status. Please try again.');
    }
  };

  const getPriorityColor = (priority: Case['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: Case['status']) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-orange-100 text-orange-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
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

  // Only lawyers and admins can access this view
  if (currentUser.role === 'client') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">This view is only available to lawyers and administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading your assigned cases...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Cases Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">My Assigned Cases</h2>
          <p className="text-sm text-gray-500 mt-1">
            {assignedCases.length} case{assignedCases.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {assignedCases.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Cases</h3>
              <p className="text-gray-500 text-sm">
                You don't have any cases assigned to you yet. 
                Cases will appear here when an administrator assigns them to you.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {assignedCases.map((case_) => (
                <div
                  key={case_.id}
                  onClick={() => setSelectedCase(case_)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedCase?.id === case_.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {case_.clientName}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(case_.priority)}`}>
                      {case_.priority}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2">{case_.caseType || 'General Inquiry'}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(case_.status)}`}>
                      {case_.status}
                    </span>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{case_.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {case_.conversationId && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-blue-600">
                      <MessageSquare className="h-3 w-3" />
                      <span>Has conversation</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Case Details */}
      <div className="flex-1 flex flex-col">
        {selectedCase ? (
          <>
            {/* Case Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedCase.clientName}</h1>
                  <p className="text-gray-600 mt-1">{selectedCase.caseType || 'General Inquiry'}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(selectedCase.priority)}`}>
                    {selectedCase.priority} priority
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedCase.status)}`}>
                    {selectedCase.status}
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>Case Overview</span>
                </button>
                {selectedCase.conversationId && (
                  <button
                    onClick={() => setActiveTab('communication')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'communication'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Client Communication</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'overview' && (
                <div className="p-6 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Client Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <User className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{selectedCase.clientName}</p>
                            <p className="text-sm text-gray-500">Client Name</p>
                          </div>
                        </div>
                        {selectedCase.clientContact && (
                          <div className="flex items-center space-x-3">
                            <Phone className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{selectedCase.clientContact}</p>
                              <p className="text-sm text-gray-500">Contact Information</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Case Details */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Case Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedCase.caseType || 'General Inquiry'}</p>
                          <p className="text-sm text-gray-500">Case Type</p>
                        </div>
                        <div>
                          <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getPriorityColor(selectedCase.priority)}`}>
                            {selectedCase.priority}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">Priority Level</p>
                        </div>
                        <div>
                          <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedCase.status)}`}>
                            {selectedCase.status}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">Current Status</p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Case Timeline</h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Case Created</p>
                            <p className="text-sm text-gray-500">{selectedCase.createdAt.toLocaleString()}</p>
                          </div>
                        </div>
                        {selectedCase.assignedAt && (
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Assigned to You</p>
                              <p className="text-sm text-gray-500">{selectedCase.assignedAt.toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                        {selectedCase.responseTimeMinutes && (
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">First Response</p>
                              <p className="text-sm text-gray-500">
                                Response time: {formatResponseTime(selectedCase.responseTimeMinutes)}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedCase.closedAt && (
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Case Closed</p>
                              <p className="text-sm text-gray-500">{selectedCase.closedAt.toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Case Actions */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Case Actions</h3>
                      <div className="space-y-3">
                        {selectedCase.status === 'assigned' && (
                          <button
                            onClick={() => handleUpdateCaseStatus(selectedCase.id, 'in-progress')}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Start Working on Case
                          </button>
                        )}
                        {(selectedCase.status === 'assigned' || selectedCase.status === 'in-progress') && (
                          <button
                            onClick={() => {
                              const reason = prompt('Please provide a closure reason:');
                              if (reason) {
                                handleUpdateCaseStatus(selectedCase.id, 'closed', reason);
                              }
                            }}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Close Case
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  {selectedCase.notes && (
                    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Case Notes</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedCase.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'communication' && selectedCase.conversationId && (
                <div className="h-full">
                  <TelegramBotInterface 
                    botToken={botToken}
                    currentUser={currentUser}
                    restrictToConversation={selectedCase.conversationId}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Case</h3>
              <p className="text-gray-500">Choose a case from the sidebar to view details and communicate with clients</p>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      {selectedCase && (
        <div className="absolute bottom-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-sm">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Private & Secure</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            This case and its communications are exclusively accessible to you and administrators.
          </p>
        </div>
      )}
    </div>
  );
}