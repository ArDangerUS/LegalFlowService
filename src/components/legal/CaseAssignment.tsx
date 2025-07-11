import React, { useState, useEffect } from 'react';
import { t } from '../../localization';
import { 
  FileText, 
  Users, 
  User,
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Search,
  Filter,
  ArrowRight,
  MessageSquare,
  Shield,
  Eye
} from 'lucide-react';
import { LegalCaseService } from '../../services/LegalCaseService';
import type { Case, User as UserType } from '../../types/legal';

interface CaseAssignmentProps {
  currentUser: UserType;
}

export default function CaseAssignment({ currentUser }: CaseAssignmentProps) {
  const [unassignedCases, setUnassignedCases] = useState<Case[]>([]);
  const [assignedCases, setAssignedCases] = useState<Case[]>([]);
  const [lawyers, setLawyers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [filters, setFilters] = useState({
    priority: '',
    caseType: '',
    search: ''
  });

  const caseService = new LegalCaseService();

  useEffect(() => {
    loadCases();
    loadLawyers();
  }, [filters]);

  const loadCases = async () => {
    try {
      setLoading(true);
      
      // Load unassigned cases
      const unassigned = await caseService.getCases({
        assignedLawyerId: 'unassigned',
        ...(filters.priority && { priority: filters.priority })
      });
      
      // Load assigned cases
      const assigned = await caseService.getCases({
        status: 'assigned'
      });
      
      // Apply search filter
      let filteredUnassigned = unassigned;
      let filteredAssigned = assigned;
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredUnassigned = unassigned.filter(c => 
          c.clientName.toLowerCase().includes(searchTerm) ||
          c.caseType?.toLowerCase().includes(searchTerm) ||
          c.clientContact?.toLowerCase().includes(searchTerm)
        );
        filteredAssigned = assigned.filter(c => 
          c.clientName.toLowerCase().includes(searchTerm) ||
          c.caseType?.toLowerCase().includes(searchTerm) ||
          c.assignedLawyerName?.toLowerCase().includes(searchTerm)
        );
      }
      
      setUnassignedCases(filteredUnassigned);
      setAssignedCases(filteredAssigned);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLawyers = async () => {
    try {
      const users = await caseService.getUsers();
      setLawyers(users.filter(u => (u.role === 'lawyer' || u.role === 'admin') && u.isActive));
    } catch (error) {
      console.error('Failed to load lawyers:', error);
    }
  };

  const handleAssignCase = async (lawyerId: string) => {
    if (!selectedCase) return;
    
    try {
      setAssignmentLoading(true);
      await caseService.assignCase(selectedCase.id, lawyerId, currentUser.id);
      
      setShowAssignModal(false);
      setShowReassignModal(false);
      setSelectedCase(null);
      loadCases();
      
      // Show success notification
      alert(`Case "${selectedCase.clientName}" has been assigned successfully!`);
    } catch (error) {
      console.error('Failed to assign case:', error);
      alert('Failed to assign case. Please try again.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const openAssignModal = (case_: Case) => {
    setSelectedCase(case_);
    setShowAssignModal(true);
  };

  const openReassignModal = (case_: Case) => {
    setSelectedCase(case_);
    setShowReassignModal(true);
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

  const formatResponseTime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Only admins can access case assignment
  if (currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">Only administrators can manage case assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Case Assignment</h1>
          <p className="text-gray-600 mt-1">Assign cases to lawyers and manage case access</p>
        </div>
        
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Unassigned: {unassignedCases.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Assigned: {assignedCases.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search cases..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
            <select
              value={filters.caseType}
              onChange={(e) => setFilters(prev => ({ ...prev, caseType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="General Inquiry">General Inquiry</option>
              <option value="Litigation">Litigation</option>
              <option value="Corporate">Corporate</option>
              <option value="Family Law">Family Law</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ priority: '', caseType: '', search: '' })}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Unassigned Cases */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-medium text-yellow-900">Unassigned Cases</h3>
              <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">
                {unassignedCases.length}
              </span>
            </div>
            <p className="text-sm text-yellow-700">Cases waiting for lawyer assignment</p>
          </div>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading cases...</p>
            </div>
          ) : unassignedCases.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Cases Assigned</h3>
              <p className="text-gray-500">No unassigned cases found. Great work!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {unassignedCases.map((case_) => (
                <div key={case_.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{case_.clientName}</h4>
                      <p className="text-sm text-gray-600">{case_.clientContact}</p>
                      <p className="text-sm text-gray-500 mt-1">{case_.caseType || 'General Inquiry'}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(case_.priority)}`}>
                      {case_.priority}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{case_.createdAt.toLocaleDateString()}</span>
                      </div>
                      {case_.conversationId && (
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>Has conversation</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => openAssignModal(case_)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Assign to Lawyer</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assigned Cases */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-blue-900">Assigned Cases</h3>
              <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full">
                {assignedCases.length}
              </span>
            </div>
            <p className="text-sm text-blue-700">Cases currently assigned to lawyers</p>
          </div>
        </div>
        
        <div className="p-6">
          {assignedCases.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Cases</h3>
              <p className="text-gray-500">Assigned cases will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Lawyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedCases.map((case_) => (
                    <tr key={case_.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{case_.clientName}</div>
                          <div className="text-sm text-gray-500">{case_.clientContact}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {case_.caseType || 'General Inquiry'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(case_.priority)}`}>
                          {case_.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 bg-blue-100 rounded-full">
                            <User className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="text-sm text-gray-900">{case_.assignedLawyerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {case_.assignedAt?.toLocaleDateString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatResponseTime(case_.responseTimeMinutes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openReassignModal(case_)}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <User className="h-4 w-4" />
                          <span>Reassign</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {(showAssignModal || showReassignModal) && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {showReassignModal ? 'Reassign Case' : 'Assign Case to Lawyer'}
            </h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Case Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Client:</strong> {selectedCase.clientName}</p>
                <p><strong>Type:</strong> {selectedCase.caseType || 'General Inquiry'}</p>
                <p><strong>Priority:</strong> {selectedCase.priority}</p>
                {showReassignModal && (
                  <p><strong>Currently assigned to:</strong> {selectedCase.assignedLawyerName}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-gray-900">Select Lawyer:</h4>
3уу3              <div className="max-h-[40vh] overflow-y-auto pr-1">
                {lawyers.map(lawyer => (
                  <button
                    key={lawyer.id}
                    onClick={() => handleAssignCase(lawyer.id)}
                    disabled={assignmentLoading || (showReassignModal && lawyer.id === selectedCase.assignedLawyerId)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{lawyer.name}</div>
                        <div className="text-sm text-gray-500">{lawyer.email}</div>
                        <div className="text-xs text-gray-400 capitalize">{lawyer.role}</div>
                      </div>
                      {showReassignModal && lawyer.id === selectedCase.assignedLawyerId && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setShowReassignModal(false);
                  setSelectedCase(null);
                }}
                disabled={assignmentLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            
            {assignmentLoading && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">
                  {showReassignModal ? 'Reassigning...' : 'Assigning...'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Access Control Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium text-blue-800">Access Control & Privacy</h3>
        </div>
        <div className="text-sm text-blue-700 mt-2 space-y-1">
          <p>• Once assigned, only the designated lawyer can access the case and its communications</p>
          <p>• Chat history and client information remain private between client and assigned lawyer</p>
          <p>• Admins can reassign cases but cannot access private communications</p>
          <p>• All assignments are logged for audit purposes</p>
        </div>
      </div>
    </div>
  );
}