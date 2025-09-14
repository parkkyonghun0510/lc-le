'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplication, useSubmitApplication, useApproveApplication, useRejectApplication } from '@/hooks/useApplications';
import { useFiles, useDownloadFile } from '@/hooks/useFiles';
import { useFolders } from '@/hooks/useFolders';
import type { File as ApiFile } from '@/types/models';
import FilePreview from '@/components/files/FilePreview';
import ImageThumbnail from '@/components/files/ImageThumbnail';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  IdentificationIcon,
  PhoneIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  
  DocumentDuplicateIcon,
  UserGroupIcon,
  BanknotesIcon,
  HomeIcon,
  TruckIcon,
  AcademicCapIcon,
  HeartIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { formatCurrency, formatDateDOB, formatDate } from '@/lib/utils';
import { CurrencyProvider, useFormatCurrency } from '@/contexts/CurrencyContext';
import Link from 'next/link';


const statusConfig = {
  draft: { 
    label: 'ព្រាង', 
    color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700', 
    icon: DocumentTextIcon,
    khmer: 'ព្រាង'
  },
  submitted: { 
    label: 'បានដាក់ស្នើ', 
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700', 
    icon: ClockIcon,
    khmer: 'បានដាក់ស្នើ'
  },
  pending: { 
    label: 'កំពុងរង់ចាំ', 
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700', 
    icon: ClockIcon,
    khmer: 'កំពុងរង់ចាំ'
  },
  under_review: { 
    label: 'កំពុងពិនិត្យ', 
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700', 
    icon: ClockIcon,
    khmer: 'កំពុងពិនិត្យ'
  },
  approved: { 
    label: 'អនុម័ត', 
    color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700', 
    icon: CheckCircleIcon,
    khmer: 'អនុម័ត'
  },
  rejected: { 
    label: 'បដិសេធ', 
    color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700', 
    icon: XCircleIcon,
    khmer: 'បដិសេធ'
  }
};

const purposeIcons = {
  business: BanknotesIcon,
  agriculture: HomeIcon,
  education: AcademicCapIcon,
  housing: HomeIcon,
  vehicle: TruckIcon,
  medical: HeartIcon,
  other: EllipsisHorizontalIcon
};

const purposeLabels = {
  business: 'អាជីវកម្ម',
  agriculture: 'កសិកម្ម',
  education: 'អប់រំ',
  housing: 'លំនៅដ្ឋាន',
  vehicle: 'យានយន្ត',
  medical: 'វេជ្ជសាស្ត្រ',
  other: 'ផ្សេងៗ'
};

function ApplicationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const formatCurrencyWithConversion = useFormatCurrency();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const applicationId = params.id as string;
  const { data: application, isLoading, error } = useApplication(applicationId);
  const submitMutation = useSubmitApplication();
  const approveMutation = useApproveApplication();
  const rejectMutation = useRejectApplication();

  // Files/folders for grouping
  const { data: allFilesData } = useFiles({ application_id: applicationId, limit: 100 });
  const { data: appFolders = [] } = useFolders({ application_id: applicationId });
  const files: ApiFile[] = allFilesData?.items || [];
  const { downloadFile } = useDownloadFile();
  const [previewFile, setPreviewFile] = useState<ApiFile | null>(null);
  const [previewList, setPreviewList] = useState<ApiFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  // TODO: Replace with static options or new data source
  const productTypes = { 
    data: [], 
    isLoading: false, 
    error: null,
    getLabel: (value: string | null | undefined) => value || null
  };
  const idCardTypes = { 
    data: [], 
    isLoading: false, 
    error: null,
    getLabel: (value: string | null | undefined) => value || null
  };

  const isImageFile = (f: ApiFile) => {
    const byMime = typeof f.mime_type === 'string' && f.mime_type.toLowerCase().startsWith('image/');
    const byExt = typeof (f.display_name || f.original_filename) === 'string' && /\.(jpg|jpeg|png|gif|webp|bmp|tiff|heic)$/i.test(f.display_name || f.original_filename);
    return byMime || byExt;
  };

  const openPreview = (file: ApiFile, list: ApiFile[]) => {
    setPreviewList(list);
    const idx = list.findIndex(f => f.id === file.id);
    setPreviewIndex(idx >= 0 ? idx : 0);
    setPreviewFile(file);
  };

  const navigatePreview = (direction: 'prev' | 'next') => {
    setPreviewIndex((prev) => {
      const newIdx = direction === 'prev' ? prev - 1 : prev + 1;
      if (newIdx >= 0 && newIdx < previewList.length) {
        setPreviewFile(previewList[newIdx]);
        return newIdx;
      }
      return prev;
    });
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="animate-pulse space-y-6">
            {/* Header Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div>
                    <div className="h-6 bg-gray-200 rounded-lg w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-32"></div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="h-10 w-20 bg-gray-200 rounded-xl"></div>
                  <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
            
            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                      <div className="h-6 bg-gray-200 rounded-lg w-32"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded-lg"></div>
                      <div className="h-4 bg-gray-200 rounded-lg w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="h-6 bg-gray-200 rounded-lg w-24 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !application) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
            <div className="text-center">
              <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-4">
                <XCircleIcon className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">រកមិនឃើញពាក្យសុំ</h2>
              <p className="text-gray-600 mb-6">ពាក្យសុំនេះមិនមានឬត្រូវបានលុប</p>
              <Link
                href="/applications"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                ត្រលប់ទៅបញ្ជីពាក្យសុំ
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const config = statusConfig[application.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = config.icon;

  const canEdit = user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id;
  const canApprove = (user?.role === 'admin' || user?.role === 'manager') && application.status === 'submitted';
  const canSubmit = application.user_id === user?.id && application.status === 'draft';

  const handleSubmit = () => {
    submitMutation.mutate(applicationId);
  };

  const handleApprove = () => {
    approveMutation.mutate({ 
      id: applicationId, 
      data: {
        approved_amount: application?.requested_amount || 0,
        approved_term: application?.desired_loan_term || 12,
        interest_rate: 1.5 // Default interest rate
      }
    });
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      rejectMutation.mutate({ id: applicationId, reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => router.back()}
                  className="group flex items-center px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-x-0.5"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" />
                  <span className="font-medium">Back</span>
                </button>
                
                <div className="flex items-center space-x-4 pl-6 border-l border-gray-200 dark:border-gray-600">
                  <div className="relative">
                    <div className="p-4 bg-gradient-to-br from-primary-100 via-primary-50 to-blue-100 dark:from-primary-900/50 dark:via-primary-800/30 dark:to-blue-800/50 rounded-2xl shadow-inner">
                      <UserIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
                  </div>
                  
                  <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                      {application.full_name_khmer || application.full_name_latin || 'ពាក្យសុំកម្ចី'}
                    </h1>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      <span className="font-medium text-sm">
                        កាលបរិច្ឆេទបង្កើត: {formatDate(application.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Enhanced Status Badge */}
                <div className={`relative inline-flex items-center px-5 py-3 rounded-2xl border-2 ${config.color} shadow-lg backdrop-blur-sm`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
                  <StatusIcon className="w-5 h-5 mr-3 relative z-10" />
                  <span className="font-semibold text-sm relative z-10">{config.khmer}</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-current rounded-full opacity-60 animate-pulse"></div>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="flex items-center space-x-3">
                  {canEdit && (
                    <Link
                      href={`/applications/${applicationId}/edit`}
                      className="group inline-flex items-center px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 border border-gray-200 dark:border-gray-600"
                    >
                      <PencilIcon className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                      <span className="font-medium">កែប្រែ</span>
                    </Link>
                  )}

                  {canSubmit && (
                    <button
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      className="group inline-flex items-center px-5 py-3 bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-500 dark:to-blue-500 text-white rounded-xl hover:from-primary-700 hover:to-blue-700 dark:hover:from-primary-600 dark:hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-md"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="font-medium">កំពុងដាក់ស្នើ...</span>
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                          <span className="font-medium">ដាក់ស្នើ</span>
                        </>
                      )}
                    </button>
                  )}

                  {canApprove && (
                    <div className="flex space-x-3">
                      <button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="group inline-flex items-center px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 dark:hover:from-green-600 dark:hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-md"
                      >
                        {approveMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="font-medium">កំពុងអនុម័ត...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                            <span className="font-medium">អនុម័ត</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="group inline-flex items-center px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 dark:from-red-500 dark:to-rose-500 text-white rounded-xl hover:from-red-700 hover:to-rose-700 dark:hover:from-red-600 dark:hover:to-rose-600 transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-md"
                      >
                        <XCircleIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium">បដិសេធ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white dark:bg-gray-800 mt-4 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="px-8 py-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                      <UserIcon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Customer Information
                      </h2>
                      <p className="text-base text-blue-600 dark:text-blue-400 font-medium">
                        ព័ត៌មានអតិថិជន
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="group relative p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl border border-blue-200 dark:border-blue-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-blue-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <IdentificationIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Khmer Name</p>
                              <div className="h-1 w-1 bg-blue-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 font-medium">ឈ្មោះជាភាសាខ្មែរ</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{application.full_name_khmer || 'មិនបានបញ្ជាក់'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="group relative p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl border border-purple-200 dark:border-purple-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-purple-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <IdentificationIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Latin Name</p>
                              <div className="h-1 w-1 bg-purple-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-purple-600 dark:text-purple-400 mb-3 font-medium">ឈ្មោះជាអក្សរឡាតាំង</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{application.full_name_latin || 'មិនបានបញ្ជាក់'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-2xl border border-green-200 dark:border-green-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-green-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <PhoneIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Phone Number</p>
                              <div className="h-1 w-1 bg-green-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400 mb-3 font-medium">លេខទូរស័ព្ទ</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">{application.phone || 'មិនបានបញ្ជាក់'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="group relative p-6 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-800/20 rounded-2xl border border-orange-200 dark:border-orange-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-orange-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <IdentificationIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">ID Card Type</p>
                              <div className="h-1 w-1 bg-orange-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mb-3 font-medium">ប្រភេទអត្តសញ្ញាណប័ណ្ណ</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{idCardTypes.getLabel(application.id_card_type) || 'មិនបានបញ្ជាក់'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-800/20 rounded-2xl border border-indigo-200 dark:border-indigo-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-indigo-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <IdentificationIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">ID Number</p>
                              <div className="h-1 w-1 bg-indigo-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3 font-medium">លេខអត្តសញ្ញាណប័ណ្ណ</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white font-mono tracking-wider">{application.id_number || 'មិនបានបញ្ជាក់'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-900/20 dark:to-pink-800/20 rounded-2xl border border-rose-200 dark:border-rose-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-rose-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <CalendarIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wide">Date of Birth</p>
                              <div className="h-1 w-1 bg-rose-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-rose-600 dark:text-rose-400 mb-3 font-medium">ថ្ងៃខែឆ្នាំកំណើត</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{application.date_of_birth ? formatDateDOB(application.date_of_birth) : 'មិនបានបញ្ជាក់'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="px-8 py-6 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                      <CurrencyDollarIcon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Loan Details
                      </h2>
                      <p className="text-base text-green-600 dark:text-green-400 font-medium">
                        ព័ត៌មានកម្ចី
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="group relative p-6 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-2xl border border-green-200 dark:border-green-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-green-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <CurrencyDollarIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Requested Amount</p>
                              <div className="h-1 w-1 bg-green-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400 mb-3 font-medium">ចំនួនទឹកប្រាក់ស្នើសុំ</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
                              {application.requested_amount 
                                ? formatCurrencyWithConversion(application.requested_amount, 'KHR')
                                : 'មិនបានបញ្ជាក់'
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 rounded-2xl border border-blue-200 dark:border-blue-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-blue-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <CalendarIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Loan Term</p>
                              <div className="h-1 w-1 bg-blue-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 font-medium">ចំនួនបង់(ដង)</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {application.desired_loan_term || 'មិនបានបញ្ជាក់'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-800/20 rounded-2xl border border-purple-200 dark:border-purple-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-purple-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <DocumentTextIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Product Type</p>
                              <div className="h-1 w-1 bg-purple-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-purple-600 dark:text-purple-400 mb-3 font-medium">ប្រភេទផលិតផល</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                              {productTypes.getLabel(application.product_type) || 'មិនបានបញ្ជាក់'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="group relative p-6 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-800/20 rounded-2xl border border-orange-200 dark:border-orange-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-orange-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <CalendarIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Disbursement Date</p>
                              <div className="h-1 w-1 bg-orange-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mb-3 font-medium">កាលបរិច្ឆេទចង់បានប្រាក់</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {application.requested_disbursement_date 
                                ? formatDate(application.requested_disbursement_date)
                                : 'មិនបានបញ្ជាក់'
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-800/20 rounded-2xl border border-indigo-200 dark:border-indigo-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-indigo-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <DocumentTextIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Loan Purpose</p>
                              <div className="h-1 w-1 bg-indigo-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3 font-medium">គោលបំណងប្រើប្រាស់</p>
                            <div className="flex flex-wrap gap-2">
                              {application.loan_purposes && application.loan_purposes.length > 0 ? (
                                application.loan_purposes.map((purpose, index) => {
                                  const Icon = purposeIcons[purpose as keyof typeof purposeIcons] || EllipsisHorizontalIcon;
                                  const label = purposeLabels[purpose as keyof typeof purposeLabels] || purpose;
                                  return (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                                    >
                                      <Icon className="w-4 h-4 mr-2" />
                                      {label}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400 font-medium">មិនបានបញ្ជាក់</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                    {application.purpose_details && (
                      <div className="group relative p-6 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-800/20 rounded-2xl border border-indigo-200 dark:border-indigo-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-indigo-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <DocumentTextIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Loan Purpose</p>
                              <div className="h-1 w-1 bg-indigo-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3 font-medium">ព័ត៌មានលម្អិតអំពីគោលបំណង</p>
                            <div className="flex flex-wrap gap-2">
                              <p>
                                {application.purpose_details}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Guarantor Information */}
              {(application.guarantor_name || application.guarantor_phone) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="px-8 py-6 bg-gradient-to-r from-purple-50 via-violet-50 to-fuchsia-50 dark:from-purple-900/20 dark:via-violet-900/20 dark:to-fuchsia-900/20 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-lg">
                        <UserGroupIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Guarantor Information
                        </h2>
                        <p className="text-base text-purple-600 dark:text-purple-400 font-medium">
                          ព័ត៌មានអ្នកធានា
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="group relative p-6 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-800/20 rounded-2xl border border-purple-200 dark:border-purple-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-purple-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <UserIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Guarantor Name</p>
                              <div className="h-1 w-1 bg-purple-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-purple-600 dark:text-purple-400 mb-3 font-medium">ឈ្មោះអ្នកធានា</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
                              {application.guarantor_name || 'មិនបានបញ្ជាក់'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-800/20 rounded-2xl border border-blue-200 dark:border-blue-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-blue-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <PhoneIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Phone Number</p>
                              <div className="h-1 w-1 bg-blue-400 rounded-full"></div>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 font-medium">លេខទូរស័ព្ទអ្នកធានា</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                              {application.guarantor_phone || 'មិនបានបញ្ជាក់'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Files grouped by folder */}
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <DocumentDuplicateIcon className="w-6 h-6 mr-2 text-orange-600 dark:text-orange-400" />
                  ឯកសារ (តាមថត)
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">Documents by Folder</span>
                </h2>

                {appFolders.length === 0 && files.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">មិនមានឯកសារ</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">No documents available</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Known folders first: borrower, guarantor, collateral */}
                    {['borrower', 'guarantor', 'collateral'].map((role) => {
                      const folder = appFolders.find(f => f.name.toLowerCase() === role);
                      const folderFiles = files.filter(f => f.folder_id === folder?.id);
                      if (!folder && folderFiles.length === 0) return null;
                      return (
                        <div key={role} className="group relative p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-800/50 dark:to-gray-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize flex items-center">
                              <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md mr-3 group-hover:shadow-lg transition-shadow">
                                <UserGroupIcon className="w-5 h-5 text-white" />
                              </div>
                              {role}
                            </h3>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-700">{folderFiles.length} files</span>
                          </div>
                          {folderFiles.length === 0 ? (
                            <p className="text-sm text-gray-500">គ្មានឯកសារ</p>
                          ) : (
                            <>
                              {(() => {
                                const imageFiles = folderFiles.filter(f => isImageFile(f));
                                const otherFiles = folderFiles.filter(f => !isImageFile(f));
                                return (
                                  <div className="space-y-4">
                                    {imageFiles.length > 0 && (
                                      <div>
                                        <div className="mb-2 text-sm text-gray-700">រូបភាព</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                          {imageFiles.map(file => (
                                            <div
                                              key={file.id}
                                              className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                              onClick={() => openPreview(file, folderFiles)}
                                            >
                                              <div className="relative overflow-hidden rounded-lg">
                                                <ImageThumbnail file={file} size="lg" className="w-full h-40 object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                  <div className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-md">
                                                    <EyeIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="mt-3 text-xs font-medium text-gray-700 dark:text-gray-300 truncate" title={file.display_name || file.original_filename}>
                  {file.display_name || file.original_filename}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {otherFiles.length > 0 && (
                                      <div>
                                        <div className="mb-2 text-sm text-gray-700">ឯកសារ</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {otherFiles.map(file => (
                                            <div key={file.id} className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
                                              <div className="flex items-start space-x-3 mb-3">
                                                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                                  <DocumentTextIcon className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate block" title={file.display_name || file.original_filename}>
                  {file.display_name || file.original_filename}
                                                  </span>
                                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{(file.file_size / 1024).toFixed(0)} KB</p>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:scale-[1.02] transition-all duration-200"
                                                  onClick={() => openPreview(file, folderFiles)}
                                                >
                                                  <EyeIcon className="w-4 h-4 mr-1.5" /> មើល
                                                </button>
                                                <button
                                                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 hover:scale-[1.02] transition-all duration-200"
                                                  onClick={() => downloadFile(file.id, file.display_name || file.original_filename)}
                                                >
                                                  <ArrowDownTrayIcon className="w-4 h-4 mr-1.5" /> ទាញយក
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Any other folders */}
                    {appFolders
                      .filter(f => !['borrower', 'guarantor', 'collateral'].includes(f.name.toLowerCase()))
                      .map(folder => {
                        const folderFiles = files.filter(f => f.folder_id === folder.id);
                        return (
                          <div key={folder.id}>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-semibold">{folder.name}</h3>
                              <span className="text-xs text-gray-500">{folderFiles.length} files</span>
                            </div>
                            {folderFiles.length === 0 ? (
                              <p className="text-sm text-gray-500">គ្មានឯកសារ</p>
                            ) : (
                              <>
                                {(() => {
                                  const imageFiles = folderFiles.filter(f => isImageFile(f));
                                  const otherFiles = folderFiles.filter(f => !isImageFile(f));
                                  return (
                                    <div className="space-y-4">
                                      {imageFiles.length > 0 && (
                                        <div>
                                          <div className="mb-2 text-sm text-gray-700">រូបភាព</div>
                                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {imageFiles.map(file => (
                                              <div
                                                key={file.id}
                                                className="border border-gray-200 rounded-lg p-2 hover:shadow-sm transition-shadow cursor-pointer"
                                                onClick={() => openPreview(file, folderFiles)}
                                              >
                                                <ImageThumbnail file={file} size="lg" className="w-full h-40" />
                                                <div className="mt-2 text-xs text-gray-700 truncate" title={file.display_name || file.original_filename}>
                  {file.display_name || file.original_filename}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {otherFiles.length > 0 && (
                                        <div>
                                          <div className="mb-2 text-sm text-gray-700">ឯកសារ</div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {otherFiles.map(file => (
                                              <div key={file.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                                <div className="flex items-center mb-1">
                                                  <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-400" />
                                                  <span className="text-sm font-medium text-gray-900 truncate" title={file.display_name || file.original_filename}>
                  {file.display_name || file.original_filename}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-gray-500">{(file.file_size / 1024).toFixed(0)} KB</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                  <button
                                                    className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                                    onClick={() => openPreview(file, folderFiles)}
                                                  >
                                                    <EyeIcon className="w-4 h-4 mr-1" /> មើល
                                                  </button>
                                                  <button
                                                    className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                                    onClick={() => downloadFile(file.id, file.display_name || file.original_filename)}
                                                  >
                                                    <ArrowDownTrayIcon className="w-4 h-4 mr-1" /> ទាញយក
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        );
                      })}

                    {/* Orphan files (no folder) */}
                    {(() => {
                      const orphanFiles = files.filter(f => !f.folder_id);
                      if (orphanFiles.length === 0) return null;
                      const imageFiles = orphanFiles.filter(f => isImageFile(f));
                      const otherFiles = orphanFiles.filter(f => !isImageFile(f));
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Other</h3>
                            <span className="text-xs text-gray-500">{orphanFiles.length} files</span>
                          </div>
                          <div className="space-y-4">
                            {imageFiles.length > 0 && (
                              <div>
                                <div className="mb-2 text-sm text-gray-700">រូបភាព</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {imageFiles.map(file => (
                                    <div
                                      key={file.id}
                                      className="border border-gray-200 rounded-lg p-2 hover:shadow-sm transition-shadow cursor-pointer"
                                      onClick={() => openPreview(file, orphanFiles)}
                                    >
                                      <ImageThumbnail file={file} size="lg" className="w-full h-40" />
                                      <div className="mt-2 text-xs text-gray-700 truncate" title={file.display_name || file.original_filename}>
                  {file.display_name || file.original_filename}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {otherFiles.length > 0 && (
                              <div>
                                <div className="mb-2 text-sm text-gray-700">ឯកសារ</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {otherFiles.map(file => (
                                    <div key={file.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                      <div className="flex items-center mb-1">
                                        <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900 truncate" title={file.display_name || file.original_filename}>
                  {file.display_name || file.original_filename}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500">{(file.file_size / 1024).toFixed(0)} KB</p>
                                      <div className="mt-2 flex items-center gap-2">
                                        <button
                                          className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                          onClick={() => openPreview(file, orphanFiles)}
                                        >
                                          <EyeIcon className="w-4 h-4 mr-1" /> មើល
                                        </button>
                                        <button
                                          className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                          onClick={() => downloadFile(file.id, file.display_name || file.original_filename)}
                                        >
                                          <ArrowDownTrayIcon className="w-4 h-4 mr-1" /> ទាញយក
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status Card */}
              <div className="group relative p-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-gray-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-md mr-3 group-hover:shadow-lg transition-shadow">
                      <StatusIcon className="w-5 h-5 text-white" />
                    </div>
                    ស្ថានភាព
                  </h3>
                  <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border-2 shadow-md hover:shadow-lg transition-all duration-200 ${config.color}`}>
                    <StatusIcon className="w-4 h-4 mr-2" />
                    {config.khmer}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="group/item relative p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">លេខកូដ</span>
                      <span className="text-sm font-mono font-bold text-blue-900 dark:text-blue-100 bg-white dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-600 shadow-sm">
                        {application.id}
                      </span>
                    </div>
                  </div>
                  
                  <div className="group/item relative p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700/50 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">ចំនួនឯកសារ</span>
                      <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                        {files.length} ឯកសារ
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">ថ្ងៃកែប្រែចុងក្រោយ</span>
                    <span className="text-sm text-gray-900">
                      {formatDate(application.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Officer Information */}
              <div className="group relative p-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-gray-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-md mr-3 group-hover:shadow-lg transition-shadow">
                    <BuildingOfficeIcon className="w-5 h-5 text-white" />
                  </div>
                  ព័ត៌មានមន្ត្រី
                </h3>

                <div className="group/item relative p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700/50 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl shadow-md group-hover/item:shadow-lg transition-shadow">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">មន្ត្រីទទួលបន្ទុក</p>
                      <p className="text-indigo-900 dark:text-indigo-100 font-bold text-base">
                        {application.portfolio_officer_name || 'មិនបានបញ្ជាក់'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="group relative p-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-gray-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md mr-3 group-hover:shadow-lg transition-shadow">
                    <ClockIcon className="w-5 h-5 text-white" />
                  </div>
                  ប្រវត្តិការណ៍
                </h3>

                <div className="space-y-6">
                  <div className="group/timeline relative flex items-start space-x-4">
                    <div className="flex-shrink-0 relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg group-hover/timeline:shadow-xl transition-all duration-200">
                        <div className="w-4 h-4 bg-white rounded-full shadow-inner"></div>
                      </div>
                      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-blue-300 to-transparent"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-blue-900 dark:text-blue-100">បង្កើតពាក្យសុំ</p>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700">
                            {formatDate(application.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">ពាក្យសុំត្រូវបានបង្កើតដំបូង</p>
                      </div>
                    </div>
                  </div>

                  {application.submitted_at && (
                    <div className="group/timeline relative flex items-start space-x-4">
                      <div className="flex-shrink-0 relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg group-hover/timeline:shadow-xl transition-all duration-200">
                          <div className="w-4 h-4 bg-white rounded-full shadow-inner"></div>
                        </div>
                        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-yellow-300 to-transparent"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-yellow-900 dark:text-yellow-100">ដាក់ស្នើ</p>
                            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-700">
                              {formatDate(application.submitted_at)}
                            </span>
                          </div>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">ពាក្យសុំត្រូវបានដាក់ស្នើសម្រាប់ពិនិត្យ</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {application.approved_at && (
                    <div className="group/timeline relative flex items-start space-x-4">
                      <div className="flex-shrink-0 relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg group-hover/timeline:shadow-xl transition-all duration-200">
                          <CheckCircleIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-green-300 to-transparent"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-green-900 dark:text-green-100">អនុម័ត</p>
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full border border-green-200 dark:border-green-700">
                              {formatDate(application.approved_at)}
                            </span>
                          </div>
                          <p className="text-xs text-green-700 dark:text-green-300 font-medium">ពាក្យសុំត្រូវបានអនុម័តជាផ្លូវការ</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {application.rejected_at && (
                    <div className="group/timeline relative flex items-start space-x-4">
                      <div className="flex-shrink-0 relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg group-hover/timeline:shadow-xl transition-all duration-200">
                          <XCircleIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-700/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-red-900 dark:text-red-100">បដិសេធ</p>
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-700">
                              {formatDate(application.rejected_at)}
                            </span>
                          </div>
                          <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-3">ពាក្យសុំត្រូវបានបដិសេធ</p>
                          {application.rejection_reason && (
                            <div className="p-3 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border border-red-300 dark:border-red-600 rounded-lg">
                              <p className="text-xs font-bold text-red-800 dark:text-red-200 mb-1">មូលហេតុ:</p>
                              <p className="text-xs text-red-700 dark:text-red-300 font-medium">{application.rejection_reason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg mr-3 shadow-md">
                    <EllipsisHorizontalIcon className="w-5 h-5 text-white" />
                  </div>
                  សកម្មភាពរហ័ស
                </h3>
                
                <div className="space-y-4">
                  {/* Edit Action */}
                  <Link
                    href={`/applications/${application.id}/edit`}
                    className="group/action flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 rounded-xl border border-blue-200/50 dark:border-blue-700/50 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 group-hover/action:from-blue-600 group-hover/action:to-indigo-600 rounded-xl shadow-md transition-all duration-200">
                        <PencilIcon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-bold text-blue-900 dark:text-blue-100">កែសម្រួល</span>
                    </div>
                    <ArrowLeftIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 rotate-180 group-hover/action:translate-x-1 transition-transform duration-200" />
                  </Link>

                  {/* Submit Action */}
                  {application.status === 'draft' && (
                    <button
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      className="group/action w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/50 dark:hover:to-emerald-900/50 rounded-xl border border-green-200/50 dark:border-green-700/50 transition-all duration-200 hover:shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 group-hover/action:from-green-600 group-hover/action:to-emerald-600 rounded-xl shadow-md transition-all duration-200">
                          <CheckCircleIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-green-900 dark:text-green-100">
                          {submitMutation.isPending ? 'កំពុងដាក់ស្នើ...' : 'ដាក់ស្នើ'}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Approve/Reject Actions for admins */}
                  {user?.role === 'admin' && ['submitted', 'pending', 'under_review'].includes(application.status) && (
                    <>
                      <button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="group/action w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/50 dark:hover:to-emerald-900/50 rounded-xl border border-green-200/50 dark:border-green-700/50 transition-all duration-200 hover:shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 group-hover/action:from-green-600 group-hover/action:to-emerald-600 rounded-xl shadow-md transition-all duration-200">
                            <CheckCircleIcon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm font-bold text-green-900 dark:text-green-100">
                            {approveMutation.isPending ? 'កំពុងអនុម័ត...' : 'អនុម័ត'}
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="group/action w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/50 dark:hover:to-rose-900/50 rounded-xl border border-red-200/50 dark:border-red-700/50 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-gradient-to-r from-red-500 to-rose-500 group-hover/action:from-red-600 group-hover/action:to-rose-600 rounded-xl shadow-md transition-all duration-200">
                            <XCircleIcon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm font-bold text-red-900 dark:text-red-100">បដិសេធ</span>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 w-full max-w-lg transform transition-all duration-300 scale-100 hover:scale-[1.01]">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl shadow-lg mr-4">
                  <XCircleIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  បដិសេធពាក្យសុំ
                </h3>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  មូលហេតុបដិសេធ
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none font-medium text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="សូមបញ្ជាក់មូលហេតុនៃការបដិសេធ..."
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="group px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-xl hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-500 dark:hover:to-gray-600 transition-all duration-200 font-semibold hover:shadow-md hover:scale-105"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  className="group px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                >
                  {rejectMutation.isPending ? 'កំពុងបដិសេធ...' : 'បដិសេធ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {previewFile && (
          <FilePreview
            file={previewFile}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
            files={previewList}
            currentIndex={previewIndex}
            onNavigate={navigatePreview}
            caption={(() => {
              const folder = appFolders.find(f => f.id === previewFile.folder_id);
              if (folder) return `Folder: ${folder.name}`;
              return 'Folder: Other';
            })()}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}

export default function ApplicationDetailPage() {
  return (
    <CurrencyProvider>
      <ApplicationDetailContent />
    </CurrencyProvider>
  );
}