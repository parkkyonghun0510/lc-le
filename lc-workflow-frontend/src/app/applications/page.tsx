'use client';

import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplications, useDeleteApplication } from '@/hooks/useApplications';
import { useAuth } from '@/hooks/useAuth';
import { 
  DocumentTextIcon, 
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  PhoneIcon,
  IdentificationIcon,
  Squares2X2Icon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CurrencyProvider, useFormatCurrency } from '@/contexts/CurrencyContext';
import Link from 'next/link';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

import { WorkflowActions } from '@/components/applications/WorkflowActions';
import type { CustomerApplication, WorkflowStatus } from '@/types/models';
import { useProductTypes } from '@/hooks/useEnums';

const workflowStatusConfig = {
  PO_CREATED: { 
    label: 'បានបង្កើត', 
    color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400', 
    icon: DocumentTextIcon,
    khmer: 'បានបង្កើត'
  },
  USER_COMPLETED: { 
    label: 'អតិថិជនបានបំពេញ', 
    color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400', 
    icon: CheckCircleIcon,
    khmer: 'អតិថិជនបានបំពេញ'
  },
  TELLER_PROCESSING: { 
    label: 'កំពុងដំណើរការ', 
    color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-400', 
    icon: ClockIcon,
    khmer: 'កំពុងដំណើរការ'
  },
  MANAGER_REVIEW: { 
    label: 'កំពុងពិនិត្យ', 
    color: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-400', 
    icon: UserIcon,
    khmer: 'កំពុងពិនិត្យ'
  },
  APPROVED: { 
    label: 'អនុម័ត', 
    color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400', 
    icon: CheckCircleIcon,
    khmer: 'អនុម័ត'
  },
  REJECTED: { 
    label: 'បដិសេធ', 
    color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400', 
    icon: XCircleIcon,
    khmer: 'បដិសេធ'
  }
}

function ApplicationsContent() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const formatCurrencyWithConversion = useFormatCurrency();
  const [statusFilter, setStatusFilter] = useState('');
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<WorkflowStatus | ''>('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [applicationToDelete, setApplicationToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // TODO: Replace with static options or new data source
  const productTypes = useProductTypes();

  // Role-based filtering
  const getRoleBasedFilters = () => {
    const baseFilters = {
      search: searchTerm,
      status: statusFilter,
      workflow_status: workflowStatusFilter || undefined,
      page,
      size: 10
    };

    // Add role-specific filtering
    if (user?.role === 'officer') {
      // Officers see applications they need to process
      return { ...baseFilters, workflow_status: workflowStatusFilter || 'USER_COMPLETED' as WorkflowStatus };
    } else if (user?.role === 'manager') {
      // Managers see applications ready for review
      return { ...baseFilters, workflow_status: workflowStatusFilter || 'TELLER_PROCESSING' as WorkflowStatus };
    }
    
    return baseFilters;
  };

  const { 
    data: applicationsData, 
    isLoading, 
    error 
  } = useApplications(getRoleBasedFilters());

  const deleteApplicationMutation = useDeleteApplication();

  const applications = applicationsData?.items || [];
  const totalPages = applicationsData?.pages || 1;

  // Sorting state and helpers for table view
  type SortKey = 'name' | 'id_number' | 'phone' | 'officer' | 'amount' | 'product' | 'workflow_status' | 'created_at';
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'created_at' || key === 'amount' ? 'desc' : 'asc');
    }
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const sortedApplications = useMemo<CustomerApplication[]>(() => {
    const arr = [...applications];
    const getValue = (a: any) => {
      switch (sortKey) {
        case 'name':
          return a.full_name_khmer || a.full_name_latin || '';
        case 'id_number':
          return a.id_number || '';
        case 'phone':
          return a.phone || '';
        case 'officer':
          return a.portfolio_officer_name || '';
        case 'amount':
          return typeof a.requested_amount === 'number' ? a.requested_amount : -Infinity;
        case 'product':
          return productTypes.getLabel?.(a.product_type) || '';
        case 'workflow_status':
          return a.workflow_status || '';
        case 'created_at':
        default:
          return a.created_at || '';
      }
    };
    arr.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      let res = 0;
      if (sortKey === 'amount') {
        const na = Number(va);
        const nb = Number(vb);
        res = (isNaN(na) ? -Infinity : na) - (isNaN(nb) ? -Infinity : nb);
      } else if (sortKey === 'created_at') {
        res = new Date(va as string).getTime() - new Date(vb as string).getTime();
      } else {
        res = String(va).localeCompare(String(vb), 'km-KH', { sensitivity: 'base' });
      }
      return sortDirection === 'asc' ? res : -res;
    });
    return arr;
  }, [applications, sortKey, sortDirection, productTypes]);

  const handleDeleteClick = (application: any) => {
    setApplicationToDelete(application);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (applicationToDelete) {
      try {
        await deleteApplicationMutation.mutateAsync(applicationToDelete.id);
        setShowDeleteDialog(false);
        setApplicationToDelete(null);
      } catch (error) {
        // Error is handled by the mutation's onError callback
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setApplicationToDelete(null);
  };

  const getWorkflowStatusBadge = (workflowStatus: WorkflowStatus) => {
    const config = workflowStatusConfig[workflowStatus] || workflowStatusConfig.PO_CREATED;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.khmer}
      </span>
    );
  };

  const getLoanPurposeText = (purposes: string[] | null | undefined) => {
    if (!purposes || purposes.length === 0) return 'មិនបានបញ្ជាក់';
    
    const purposeMap: { [key: string]: string } = {
      'commerce': 'អាជីវកម្ម',
      'agriculture': 'កសិកម្ម',
      'education': 'ការសិក្សា',
      'housing': 'លំនៅដ្ឋាន',
      'vehicle': 'យានយន្ត',
      'medical': 'វេជ្ជសាស្ត្រ',
      'other': 'ផ្សេងៗ'
    };
    
    return purposes.map(p => purposeMap[p] || p).join(', ');
  };

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-2">មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ</h2>
            <p className="text-gray-600">សូមព្យាយាមម្តងទៀត</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl">
                  <DocumentTextIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">ការគ្រប់គ្រងកម្ចីប្រាក់</h1>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    គ្រប់គ្រងនិងតាមដានពាក្យសុំកម្ចីរបស់អតិថិជន
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Squares2X2Icon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <ListBulletIcon className="w-5 h-5" />
                  </button>
                </div>
                <Link
                  href="/applications/new"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  <PlusIcon className="w-5 h-5 mr-3" />
                  បង្កើតពាក្យសុំថ្មី
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខអត្តសញ្ញាណ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="lg:w-56">
                <select
                  value={workflowStatusFilter}
                  onChange={(e) => setWorkflowStatusFilter(e.target.value as WorkflowStatus | '')}
                  className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="">ស្ថានភាពទាំងអស់</option>
                    {Object.entries(workflowStatusConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.khmer}</option>
                    ))}
                </select>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-6 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
                តម្រង
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      ចំនួនទឹកប្រាក់
                    </label>
                    <div className="flex space-x-4">
                      <input
                        type="number"
                        placeholder="ពី"
                        className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="number"
                        placeholder="ដល់"
                        className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      កាលបរិច្ឆេទបង្កើត
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      មន្ត្រីទទួលបន្ទុក
                    </label>
                    <select className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                      <option value="">ទាំងអស់</option>
                      {/* Add officer options */}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Applications Grid or Table */}
          {isLoading ? (
            <div className={`grid gap-8 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded-lg"></div>
                        <div className="h-3 bg-gray-200 rounded-lg w-5/6"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl w-fit mx-auto mb-6">
                <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">មិនមានពាក្យសុំកម្ចី</h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
                ចាប់ផ្តើមដោយការបង្កើតពាក្យសុំកម្ចីថ្មី
              </p>
              <div>
                <Link
                  href="/applications/new"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <PlusIcon className="w-5 h-5 mr-3" />
                  បង្កើតពាក្យសុំថ្មី
                </Link>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('name')}>
                        <div className="flex items-center space-x-2">
                          <span>ឈ្មោះអតិថិជន</span>
                          {getSortIndicator('name')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('id_number')}>
                        <div className="flex items-center space-x-2">
                          <span>លេខអត្តសញ្ញាណ</span>
                          {getSortIndicator('id_number')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('phone')}>
                        <div className="flex items-center space-x-2">
                          <span>ទូរស័ព្ទ</span>
                          {getSortIndicator('phone')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('officer')}>
                        <div className="flex items-center space-x-2">
                          <span>មន្ត្រីទទួលបន្ទុក</span>
                          {getSortIndicator('officer')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('amount')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>ចំនួនទឹកប្រាក់</span>
                          {getSortIndicator('amount')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('product')}>
                        <div className="flex items-center space-x-2">
                          <span>ផលិតផល</span>
                          {getSortIndicator('product')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('workflow_status')}>
                        <div className="flex items-center space-x-2">
                          <span>ស្ថានភាព</span>
                          {getSortIndicator('workflow_status')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('created_at')}>
                        <div className="flex items-center space-x-2">
                          <span>បង្កើតនៅ</span>
                          {getSortIndicator('created_at')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        សកម្មភាព
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedApplications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          <div className="font-semibold">
                            {application.full_name_khmer || application.full_name_latin || 'មិនបានបញ្ជាក់'}
                          </div>
                          {application.full_name_khmer && application.full_name_latin && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{application.full_name_latin}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{application.id_number || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{application.phone || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{application.portfolio_officer_name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 text-right">
                          {application.requested_amount
                            ? formatCurrencyWithConversion(application.requested_amount, 'KHR')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{productTypes.getLabel(application.product_type) || '-'}</td>
                        <td className="px-6 py-4">{getWorkflowStatusBadge(application.workflow_status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatDate(application.created_at)}</td>
                        <td className="px-6 py-4 text-sm text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/applications/${application.id}`}
                              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800 rounded-lg transition-all duration-200"
                            >
                              <EyeIcon className="w-4 h-4 mr-1.5" />
                              មើល
                            </Link>
                            {(user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id) && (
                              <Link
                                href={`/applications/${application.id}/edit`}
                                className="inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-lg transition-all duration-200"
                              >
                                <PencilIcon className="w-4 h-4 mr-1.5" />
                                កែប្រែ
                              </Link>
                            )}
                            {application.status === 'draft' && (user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id) && (
                              <button
                                onClick={() => handleDeleteClick(application)}
                                className="inline-flex items-center px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800 rounded-lg transition-all duration-200"
                                disabled={deleteApplicationMutation.isPending}
                              >
                                <TrashIcon className="w-4 h-4 mr-1.5" />
                                លុប
                              </button>
                            )}
                            {/* Workflow Actions */}
                            <WorkflowActions
                              applicationId={application.id}
                              currentStatus={application.workflow_status}
                              userRole={user?.role || 'officer'}
                              className="ml-2"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className={`grid gap-8 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {applications.map((application) => (
                <div key={application.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600 group overflow-hidden">
                  <div className="flex items-start justify-between mb-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:scale-110 transition-transform duration-200">
                        <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {application.full_name_khmer || application.full_name_latin || 'មិនបានបញ្ជាក់ឈ្មោះ'}
                        </h3>
                        {application.full_name_khmer && application.full_name_latin && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{application.full_name_latin}</p>
                        )}
                      </div>
                    </div>
                    {getWorkflowStatusBadge(application.workflow_status)}
                  </div>

                  {/* Content */}
                  <div className="p-6">

                    {/* Customer Info */}
                    <div className="space-y-3 mb-6">
                      {application.id_number && (
                        <div className="flex items-center text-sm">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                            <IdentificationIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{application.id_card_type}</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{application.id_number}</p>
                          </div>
                        </div>
                      )}
                      {application.phone && (
                        <div className="flex items-center text-sm">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg mr-3">
                            <PhoneIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">លេខទូរស័ព្ទ</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{application.phone}</p>
                          </div>
                        </div>
                      )}
                      {application.portfolio_officer_name && (
                        <div className="flex items-center text-sm">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
                            <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">មន្ត្រីទទួលបន្ទុក</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{application.portfolio_officer_name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Loan Details */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ចំនួនទឹកប្រាក់</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {application.requested_amount 
                              ? formatCurrencyWithConversion(application.requested_amount, 'KHR')
                              : 'មិនបានបញ្ជាក់'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ផលិតផល</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {productTypes.getLabel(application.product_type) || 'មិនបានបញ្ជាក់'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">គោលបំណង</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {getLoanPurposeText(application.loan_purposes)}
                        </p>
                      </div>
                    </div>

                    {/* Guarantor Info */}
                    {application.guarantor_name && (
                      <div className="mb-6">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">អ្នកធានា</p>
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <UserIcon className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                          {application.guarantor_name}
                          {application.guarantor_phone && (
                            <span className="ml-2 text-gray-600 dark:text-gray-400">({application.guarantor_phone})</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        បង្កើត: {formatDate(application.created_at)}
                      </div>
                      {application.submitted_at && (
                        <div className="flex items-center mt-2">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          ដាក់ស្នើ: {formatDate(application.submitted_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-xl border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-3">
                        <Link
                          href={`/applications/${application.id}`}
                          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                          <EyeIcon className="w-4 h-4 mr-2" />
                          មើល
                        </Link>
                        {(user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id) && (
                          <Link
                            href={`/applications/${application.id}/edit`}
                            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                          >
                            <PencilIcon className="w-4 h-4 mr-2" />
                            កែប្រែ
                          </Link>
                        )}
                        {/* Delete button - only for draft applications */}
                        {application.status === 'draft' && (user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id) && (
                          <button
                            onClick={() => handleDeleteClick(application)}
                            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            disabled={deleteApplicationMutation.isPending}
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            លុប
                          </button>
                        )}
                        {/* Workflow Actions */}
                        <WorkflowActions
                          applicationId={application.id}
                          currentStatus={application.workflow_status}
                          userRole={user?.role || 'officer'}
                          className=""
                        />
                      </div>
                      
                      {/* Document count */}
                      {application.documents && application.documents.length > 0 && viewMode === 'grid' && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-500">
                          <DocumentDuplicateIcon className="w-4 h-4 mr-1.5" />
                          {application.documents.length} ឯកសារ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && applications && applications.length > 0 && totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 font-medium">
                  បង្ហាញ <span className="font-semibold text-gray-900">{((page - 1) * 10) + 1}</span> ដល់ <span className="font-semibold text-gray-900">{Math.min(page * 10, applicationsData?.total || 0)}</span> នៃ <span className="font-semibold text-gray-900">{applicationsData?.total || 0}</span> ពាក្យសុំ
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                  >
                    មុន
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                          page === pageNum
                            ? 'text-white bg-blue-600 shadow-lg'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:shadow-md'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                  >
                    បន្ទាប់
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="លុបពាក្យសុំព្រាង"
          message={`តើអ្នកពិតជាចង់លុបពាក្យសុំព្រាងរបស់ ${applicationToDelete?.full_name_khmer || applicationToDelete?.full_name_latin || 'អតិថិជននេះ'} មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`}
          confirmText="លុប"
          cancelText="បោះបង់"
          type="danger"
          isLoading={deleteApplicationMutation.isPending}
        />
      </Layout>
    </ProtectedRoute>
  );
}

export default function ApplicationsPage() {
  return (
    <CurrencyProvider>
      <ApplicationsContent />
    </CurrencyProvider>
  );
}