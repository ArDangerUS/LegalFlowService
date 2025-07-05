import React, { useState, useEffect } from 'react';
import { t } from '../../localization';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  Mail, 
  Building,
  Search,
  Filter,
  UserCheck,
  UserX,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { LegalCaseService } from '../../services/LegalCaseService';
import type { User as UserType, Office, Invitation } from '../../types/legal';

interface UserManagementProps {
  currentUser: UserType;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    office: '',
    status: '',
    search: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'lawyer' as UserType['role'],
    officeId: '',
    isActive: true
  });

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'lawyer' as UserType['role'],
    officeId: ''
  });

  const caseService = new LegalCaseService();

  useEffect(() => {
    loadUsers();
    loadInvitations();
    loadOffices();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await caseService.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      const invitationsData = await caseService.getInvitations();
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOffices = async () => {
    try {
      const officesData = await caseService.getOffices();
      setOffices(officesData);
    } catch (error) {
      console.error('Failed to load offices:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      await caseService.createUser(formData);
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      await caseService.updateUser(selectedUser.id, formData);
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleToggleUserStatus = async (user: UserType) => {
    try {
      await caseService.updateUser(user.id, { ...user, isActive: !user.isActive });
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleSendInvitation = async () => {
    try {
      setInviteLoading(true);
      const invitation = await caseService.createInvitation(
        inviteData.email,
        inviteData.role,
        inviteData.officeId || undefined,
        currentUser.id
      );
      
      setShowInviteModal(false);
      resetInviteForm();
      loadInvitations();
      
      // Show success message with invitation details
      const invitationUrl = `${window.location.origin}/invite/${invitation.token}`;
      const message = `Invitation created successfully!\n\nEmail: ${invitation.email}\nInvitation Link: ${invitationUrl}\nExpires: ${invitation.expiresAt.toLocaleDateString('en-US')}\n\nShare this link with the user to complete their registration.`;
      
      alert(message);
      
      // Copy invitation link to clipboard
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(invitationUrl);
          console.log('Invitation link copied to clipboard');
        } catch (clipboardError) {
          console.warn('Failed to copy to clipboard:', clipboardError);
        }
      }
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      alert(`Failed to create invitation: ${error.message || 'Unknown error'}\n\nPlease check the console for more details.`);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm(t('invitation.deleteConfirm'))) return;
    
    try {
      await caseService.deleteInvitation(invitationId);
      loadInvitations();
    } catch (error) {
      console.error('Failed to delete invitation:', error);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const invitation = await caseService.resendInvitation(invitationId);
      loadInvitations();
      
      const invitationUrl = `${window.location.origin}/invite/${invitation.token}`;
      const message = `Invitation resent successfully!\n\nEmail: ${invitation.email}\nNew Link: ${invitationUrl}\nExpires: ${invitation.expiresAt.toLocaleDateString('en-US')}\n\nShare this link with the user to complete their registration.`;
      
      alert(message);
      
      // Copy invitation link to clipboard
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(invitationUrl);
          console.log('Invitation link copied to clipboard');
        } catch (clipboardError) {
          console.warn('Failed to copy to clipboard:', clipboardError);
        }
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      alert(`Failed to resend invitation: ${error}\n\nPlease check the console for more details.`);
    }
  };

  const copyInvitationLink = async (token: string) => {
    const invitationUrl = `${window.location.origin}/invite/${token}`;
    
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(invitationUrl);
        alert('Invitation link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        alert(`Copy failed. Here's the link:\n${invitationUrl}`);
      }
    } else {
      alert(`Copy not supported. Here's the link:\n${invitationUrl}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'lawyer',
      officeId: '',
      isActive: true
    });
  };

  const resetInviteForm = () => {
    setInviteData({
      email: '',
      role: 'lawyer',
      officeId: ''
    });
  };

  const openEditModal = (user: UserType) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      officeId: user.officeId || '',
      isActive: user.isActive
    });
    setShowEditModal(true);
  };

  const getRoleIcon = (role: UserType['role']) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'lawyer':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'client':
        return <User className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: UserType['role']) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'lawyer':
        return 'bg-blue-100 text-blue-800';
      case 'client':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = !filters.role || user.role === filters.role;
    const matchesOffice = !filters.office || user.officeId === filters.office;
    const matchesStatus = !filters.status || 
      (filters.status === 'active' && user.isActive) ||
      (filters.status === 'inactive' && !user.isActive);
    const matchesSearch = !filters.search || 
      user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesRole && matchesOffice && matchesStatus && matchesSearch;
  });

  // Only admins can manage users
  if (currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('users.accessRestricted')}</h3>
          <p className="text-gray-500">{t('users.adminOnly')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          <p className="text-gray-600 mt-1">{t('users.subtitle')}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Send className="h-4 w-4" />
            <span>{t('invitation.inviteUser')}</span>
          </button>
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
                placeholder={t('users.searchUsers')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.role')}</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('users.allRoles')}</option>
              <option value="admin">{t('users.admin')}</option>
              <option value="lawyer">{t('users.lawyer')}</option>
              <option value="client">{t('users.client')}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.office')}</label>
            <select
              value={filters.office}
              onChange={(e) => setFilters(prev => ({ ...prev, office: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('users.allOffices')}</option>
              {offices.map(office => (
                <option key={office.id} value={office.id}>{office.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.status')}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('users.allStatuses')}</option>
              <option value="active">{t('users.active')}</option>
              <option value="inactive">{t('users.inactive')}</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ role: '', office: '', status: '', search: '' })}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('users.clearFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.filter(inv => inv.status === 'pending').length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
            <h3 className="text-lg font-medium text-yellow-900">{t('invitation.pendingInvitations')}</h3>
            <p className="text-sm text-yellow-700">{t('invitation.pendingInvitationsDesc')}</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.office')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invitation.sentBy')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invitation.expiresAt')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.filter(inv => inv.status === 'pending').map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        invitation.role === 'admin' ? 'bg-red-100 text-red-800' :
                        invitation.role === 'lawyer' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {invitation.role === 'admin' ? t('users.admin') :
                         invitation.role === 'lawyer' ? t('users.lawyer') :
                         t('users.client')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.officeName || t('users.noOffice')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.createdByName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.expiresAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => copyInvitationLink(invitation.token)}
                          className="text-green-600 hover:text-green-900"
                          title="Copy invitation link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleResendInvitation(invitation.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('invitation.resendInvitation')}
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-900"
                          title={t('invitation.deleteInvitation')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">{t('common.loading')} {t('navigation.users').toLowerCase()}...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('users.noUsersFound')}</h3>
            <p className="text-gray-500">{t('users.noMatchingUsers')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.office')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.created')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.lastLogin')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(user.role)}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role === 'admin' ? t('users.admin') :
                           user.role === 'lawyer' ? t('users.lawyer') :
                           t('users.client')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {offices.find(o => o.id === user.officeId)?.name || t('users.noOffice')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {user.isActive ? (
                          <UserCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <UserX className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {user.isActive ? t('users.active') : t('users.inactive')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? user.lastLogin.toLocaleDateString() : t('users.never')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className={`${user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                          title={user.isActive ? t('users.deactivateUser') : t('users.activateUser')}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('invitation.inviteUser')}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invitation.invitationEmail')} *
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invitation.roleForInvitedUser')} *
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value as UserType['role'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lawyer">{t('users.lawyer')}</option>
                  <option value="admin">{t('users.admin')}</option>
                  <option value="client">{t('users.client')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.office')}
                </label>
                <select
                  value={inviteData.officeId}
                  onChange={(e) => setInviteData(prev => ({ ...prev, officeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('users.noOffice')}</option>
                  {offices.map(office => (
                    <option key={office.id} value={office.id}>{office.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Invite-Only System</h4>
              <p className="text-sm text-blue-700">
                This will create an invitation link that the user can use to register. 
                No email will be sent automatically - you'll need to share the link manually.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  resetInviteForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={!inviteData.email.trim() || inviteLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center space-x-2"
              >
                {inviteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Create Invitation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('users.createNewUser')}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.nameRequired')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.emailRequired')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.roleRequired')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserType['role'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lawyer">{t('users.lawyer')}</option>
                  <option value="admin">{t('users.admin')}</option>
                  <option value="client">{t('users.client')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.office')}</label>
                <select
                  value={formData.officeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, officeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('users.noOffice')}</option>
                  {offices.map(office => (
                    <option key={office.id} value={office.id}>{office.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  {t('users.activeUser')}
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!formData.name.trim() || !formData.email.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {t('users.createUser')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('users.editUser')}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.nameRequired')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.emailRequired')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.roleRequired')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserType['role'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lawyer">{t('users.lawyer')}</option>
                  <option value="admin">{t('users.admin')}</option>
                  <option value="client">{t('users.client')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.office')}</label>
                <select
                  value={formData.officeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, officeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('users.noOffice')}</option>
                  {offices.map(office => (
                    <option key={office.id} value={office.id}>{office.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="editIsActive" className="ml-2 block text-sm text-gray-900">
                  {t('users.activeUser')}
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={!formData.name.trim() || !formData.email.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {t('users.updateUser')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}