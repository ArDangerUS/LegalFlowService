import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Star, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { LegalCaseService } from '../../services/LegalCaseService';
import type { OfficeStats, LawyerStats, User } from '../../types/legal';

interface AnalyticsProps {
  currentUser: User;
}

export default function Analytics({ currentUser }: AnalyticsProps) {
  const [officeStats, setOfficeStats] = useState<OfficeStats[]>([]);
  const [lawyerStats, setLawyerStats] = useState<LawyerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('30');

  const caseService = new LegalCaseService();

  useEffect(() => {
    loadAnalytics();
  }, [selectedOffice, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [officeData, lawyerData] = await Promise.all([
        caseService.getOfficeStats(),
        caseService.getLawyerStats(selectedOffice || undefined)
      ]);
      
      setOfficeStats(officeData);
      setLawyerStats(lawyerData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    return officeStats.reduce((acc, office) => ({
      totalCases: acc.totalCases + office.totalCases,
      closedCases: acc.closedCases + office.closedCases,
      rejectedCases: acc.rejectedCases + office.rejectedCases,
      newRequests: acc.newRequests + office.newRequests,
      inProgressCases: acc.inProgressCases + office.inProgressCases,
      averageResponseTime: officeStats.length > 0 
        ? officeStats.reduce((sum, o) => sum + o.averageResponseTime, 0) / officeStats.length 
        : 0,
      averageSatisfactionRating: officeStats.length > 0 
        ? officeStats.reduce((sum, o) => sum + o.averageSatisfactionRating, 0) / officeStats.length 
        : 0
    }), {
      totalCases: 0,
      closedCases: 0,
      rejectedCases: 0,
      newRequests: 0,
      inProgressCases: 0,
      averageResponseTime: 0,
      averageSatisfactionRating: 0
    });
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const totalStats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Performance metrics and insights</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          
          {currentUser.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
              <select
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Offices</option>
                {officeStats.map(office => (
                  <option key={office.officeId} value={office.officeId}>
                    {office.officeName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cases</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.totalCases}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">Active cases in system</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Closed Cases</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.closedCases}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600">
              {totalStats.totalCases > 0 
                ? `${Math.round((totalStats.closedCases / totalStats.totalCases) * 100)}% completion rate`
                : 'No cases yet'
              }
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatResponseTime(totalStats.averageResponseTime)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600">Time to first response</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Satisfaction Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalStats.averageSatisfactionRating ? totalStats.averageSatisfactionRating.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600">Out of 5.0</span>
          </div>
        </div>
      </div>

      {/* Case Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Case Status Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-600">New Requests</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{totalStats.newRequests}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-gray-600">In Progress</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{totalStats.inProgressCases}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">Closed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{totalStats.closedCases}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-600">Rejected</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{totalStats.rejectedCases}</span>
            </div>
          </div>
        </div>

        {/* Office Performance */}
        {currentUser.role === 'admin' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Office Performance</h3>
            <div className="space-y-4">
              {officeStats.map(office => (
                <div key={office.officeId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{office.officeName}</h4>
                    <span className="text-xs text-gray-500">{office.totalCases} cases</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Closed:</span>
                      <span className="ml-1 font-medium text-green-600">{office.closedCases}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rejected:</span>
                      <span className="ml-1 font-medium text-red-600">{office.rejectedCases}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Response:</span>
                      <span className="ml-1 font-medium text-orange-600">
                        {formatResponseTime(office.averageResponseTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rating:</span>
                      <span className="ml-1 font-medium text-yellow-600">
                        {office.averageSatisfactionRating ? office.averageSatisfactionRating.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lawyer Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Lawyer Performance</h3>
        
        {lawyerStats.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No lawyer performance data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lawyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cases
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rejected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lawyerStats.map(lawyer => (
                  <tr key={lawyer.lawyerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lawyer.lawyerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lawyer.totalCases}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {lawyer.closedCases}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {lawyer.rejectedCases}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {lawyer.activeCases}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                      {formatResponseTime(lawyer.averageResponseTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                      {lawyer.averageSatisfactionRating ? lawyer.averageSatisfactionRating.toFixed(1) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}