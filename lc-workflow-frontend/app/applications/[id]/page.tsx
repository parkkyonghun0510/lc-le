'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplication, useSubmitApplication, useApproveApplication, useRejectApplication } from '@/hooks/useApplications';
import { useFiles, useDownloadFile, useFolders } from '@/hooks/useFiles';
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
  EllipsisHorizontalIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { formatDateDOB, formatDate } from '@/lib/utils';
import { CurrencyProvider, useFormatCurrency } from '@/contexts/CurrencyContext';
import Link from 'next/link';
import { useProductTypes, useIDCardTypes } from '@/hooks/useEnums';
import { Card, CardContent, Button } from '@/components/ui';
import { InfoCard } from '@/components/applications/InfoCard';
import { SectionHeader } from '@/components/applications/SectionHeader';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { DocumentGrid } from '@/components/applications/DocumentGrid';


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
  const { data: allFilesData, refetch: refetchFiles } = useFiles({ application_id: applicationId, limit: 100 });
  const { data: appFoldersData, refetch: refetchFolders } = useFolders({ application_id: applicationId });
  const appFolders = appFoldersData?.items || [];
  const files: ApiFile[] = allFilesData?.items || [];
  
  // Debug logging
  // console.log('Fetching files for application:', applicationId);
  // console.log('Application files:', files.length, files);
  // console.log('Application folders:', appFolders.length, appFolders);
  
  // Add refresh button for testing
  const handleRefreshFiles = () => {
    refetchFiles();
    refetchFolders();
  };
  const { downloadFile } = useDownloadFile();
  const [previewFile, setPreviewFile] = useState<ApiFile | null>(null);
  const [previewList, setPreviewList] = useState<ApiFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  // TODO: Replace with static options or new data source
  const productType = useProductTypes();
  const idCartType = useIDCardTypes();

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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-2xl"></div>
                  <div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded-lg w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-lg w-32"></div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="h-10 w-20 bg-gray-200 dark:bg-gray-600 rounded-xl"></div>
                  <div className="h-10 w-24 bg-gray-200 dark:bg-gray-600 rounded-xl"></div>
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
        interest_rate: 0 // Default interest rate
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
          <Card variant="elevated" padding="lg" className="hover:shadow-xl transition-all duration-300">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 xl:gap-0">
              {/* Back button and title section */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => router.back()}
                  className="group hover:-translate-x-0.5 w-fit"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" />
                  Back
                </Button>

                <div className="flex items-center space-x-4 sm:pl-6 sm:border-l border-gray-200 dark:border-gray-600">
                  <div className="relative flex-shrink-0">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-800/50 rounded-2xl shadow-inner">
                      <UserIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight truncate">
                      {application.full_name_khmer || application.full_name_latin || 'ពាក្យសុំកម្ចី'}
                    </h1>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="font-medium text-sm truncate">
                        កាលបរិច្ឆេទបង្កើត: {formatDate(application.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and actions section */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <StatusBadge
                  status={application.status}
                  icon={<StatusIcon />}
                  label={config.khmer}
                  variant={
                    application.status === 'approved' ? 'success' :
                    application.status === 'rejected' ? 'error' :
                    application.status === 'submitted' || application.status === 'under_review' ? 'info' :
                    application.status === 'pending' ? 'warning' : 'default'
                  }
                  size="lg"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  {canEdit && (
                    <Link href={`/applications/${applicationId}/edit`}>
                      <Button variant="secondary" size="md">
                        <PencilIcon className="w-4 h-4 mr-2" />
                        កែប្រែ
                      </Button>
                    </Link>
                  )}

                  {canSubmit && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSubmit}
                      isLoading={submitMutation.isPending}
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      ដាក់ស្នើ
                    </Button>
                  )}

                  {canApprove && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button
                        variant="success"
                        size="md"
                        onClick={handleApprove}
                        isLoading={approveMutation.isPending}
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        អនុម័ត
                      </Button>
                      <Button
                        variant="error"
                        size="md"
                        onClick={() => setShowRejectModal(true)}
                      >
                        <XCircleIcon className="w-4 h-4 mr-2" />
                        បដិសេធ
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card variant="elevated" padding="none" className="overflow-hidden hover:shadow-xl transition-all duration-300">
              <SectionHeader
                icon={<UserIcon />}
                title="Customer Information"
                khmerTitle="ព័ត៌មានអតិថិជន"
                variant="primary"
              />
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <InfoCard
                      icon={<IdentificationIcon />}
                      label="Khmer Name"
                      khmerLabel="ឈ្មោះជាភាសាខ្មែរ"
                      value={application.full_name_khmer || 'មិនបានបញ្ជាក់'}
                      variant="primary"
                    />
                    <InfoCard
                      icon={<IdentificationIcon />}
                      label="Latin Name"
                      khmerLabel="ឈ្មោះជាអក្សរឡាតាំង"
                      value={application.full_name_latin || 'មិនបានបញ្ជាក់'}
                      variant="primary"
                    />
                    <InfoCard
                      icon={<PhoneIcon />}
                      label="Phone Number"
                      khmerLabel="លេខទូរស័ព្ទ"
                      value={<span className="font-mono">{application.phone || 'មិនបានបញ្ជាក់'}</span>}
                      variant="success"
                    />
                  </div>
                  <div className="space-y-6">
                    <InfoCard
                      icon={<IdentificationIcon />}
                      label="ID Card Type"
                      khmerLabel="ប្រភេទអត្តសញ្ញាណប័ណ្ណ"
                      value={idCartType.getLabel(application.id_card_type) || 'មិនបានបញ្ជាក់'}
                      variant="warning"
                    />
                    <InfoCard
                      icon={<IdentificationIcon />}
                      label="ID Number"
                      khmerLabel="លេខអត្តសញ្ញាណប័ណ្ណ"
                      value={<span className="font-mono tracking-wider">{application.id_number || 'មិនបានបញ្ជាក់'}</span>}
                      variant="primary"
                    />
                    <InfoCard
                      icon={<CalendarIcon />}
                      label="Date of Birth"
                      khmerLabel="ថ្ងៃខែឆ្នាំកំណើត"
                      value={application.date_of_birth ? formatDateDOB(application.date_of_birth) : 'មិនបានបញ្ជាក់'}
                      variant="error"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Details */}
            <Card variant="elevated" padding="none" className="overflow-hidden hover:shadow-xl transition-all duration-300">
              <SectionHeader
                icon={<CurrencyDollarIcon />}
                title="Loan Details"
                khmerTitle="ព័ត៌មានកម្ចី"
                variant="success"
              />
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <InfoCard
                      icon={<CurrencyDollarIcon />}
                      label="Requested Amount"
                      khmerLabel="ចំនួនទឹកប្រាក់ស្នើសុំ"
                      value={
                        <span className="text-2xl font-mono text-green-600 dark:text-green-400">
                          {application.requested_amount
                            ? formatCurrencyWithConversion(application.requested_amount, 'KHR')
                            : 'មិនបានបញ្ជាក់'
                          }
                        </span>
                      }
                      variant="success"
                    />
                    <InfoCard
                      icon={<CalendarIcon />}
                      label="Loan Term"
                      khmerLabel="ចំនួនបង់(ដង)"
                      value={application.desired_loan_term || 'មិនបានបញ្ជាក់'}
                      variant="primary"
                    />
                    <InfoCard
                      icon={<DocumentTextIcon />}
                      label="Product Type"
                      khmerLabel="ប្រភេទផលិតផល"
                      value={productType.getLabel(application.product_type) || 'មិនបានបញ្ជាក់'}
                      variant="primary"
                    />
                  </div>
                  <div className="space-y-6">
                    <InfoCard
                      icon={<CalendarIcon />}
                      label="Disbursement Date"
                      khmerLabel="កាលបរិច្ឆេទចង់បានប្រាក់"
                      value={
                        application.requested_disbursement_date
                          ? formatDate(application.requested_disbursement_date)
                          : 'មិនបានបញ្ជាក់'
                      }
                      variant="warning"
                    />
                    {application.purpose_details && (
                      <InfoCard
                        icon={<DocumentTextIcon />}
                        label="Loan Purpose"
                        khmerLabel="ព័ត៌មានលម្អិតអំពីគោលបំណង"
                        value={application.purpose_details}
                        variant="primary"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assigned Employees Section */}
            <Card variant="elevated" padding="none" className="overflow-hidden hover:shadow-xl transition-all duration-300">
              <SectionHeader
                icon={<UserGroupIcon />}
                title="Assigned Employees"
                khmerTitle="បុគ្គលិកទទួលបន្ទុក"
                variant="info"
              />
              <CardContent className="p-8">
                {/* Legacy portfolio officer warning */}
                {!application.portfolio_officer_migrated && 
                 application.portfolio_officer_name && 
                 (!application.employee_assignments || application.employee_assignments.length === 0) && (
                  <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Legacy Portfolio Officer
                        </h3>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                          This application uses legacy portfolio officer: <span className="font-semibold">{application.portfolio_officer_name}</span>. Consider migrating to employee assignments.
                        </p>
                        {user?.role === 'admin' && (
                          <Link 
                            href="/admin/migrate-employees"
                            className="mt-2 inline-flex items-center text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                          >
                            Migrate to employee assignments →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Employee assignments display */}
                {application.employee_assignments && application.employee_assignments.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {application.employee_assignments.map((assignment) => {
                        const roleColors = {
                          primary_officer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
                          secondary_officer: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
                          field_officer: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
                          reviewer: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700',
                          approver: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700'
                        };

                        const roleLabels = {
                          primary_officer: 'Primary Officer',
                          secondary_officer: 'Secondary Officer',
                          field_officer: 'Field Officer',
                          reviewer: 'Reviewer',
                          approver: 'Approver'
                        };

                        const roleColor = roleColors[assignment.assignment_role] || roleColors.primary_officer;
                        const roleLabel = roleLabels[assignment.assignment_role] || assignment.assignment_role;

                        return (
                          <div 
                            key={assignment.id}
                            className="group relative p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                          >
                            <div className="space-y-4">
                              {/* Employee name */}
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                  {assignment.employee?.full_name_khmer || 'Unknown'}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {assignment.employee?.full_name_latin || ''}
                                </p>
                              </div>

                              {/* Employee code badge */}
                              {assignment.employee?.employee_code && (
                                <div className="inline-flex items-center px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                                  <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
                                    {assignment.employee.employee_code}
                                  </span>
                                </div>
                              )}

                              {/* Role badge */}
                              <div className={`inline-flex items-center px-3 py-1 rounded-lg border ${roleColor}`}>
                                <span className="text-xs font-semibold uppercase tracking-wide">
                                  {roleLabel}
                                </span>
                              </div>

                              {/* Assignment details */}
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                  <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                  <span>Assigned: {formatDate(assignment.assigned_at)}</span>
                                </div>

                                {assignment.employee?.department?.name && (
                                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <BuildingOfficeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <span>{assignment.employee.department.name}</span>
                                  </div>
                                )}

                                {assignment.employee?.branch?.name && (
                                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <BuildingOfficeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <span>{assignment.employee.branch.name}</span>
                                  </div>
                                )}
                              </div>

                              {/* Notes */}
                              {assignment.notes && (
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                    {assignment.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Edit assignments button */}
                    {canEdit && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                        <Link href={`/applications/${applicationId}/edit`}>
                          <Button variant="secondary" size="md">
                            <PencilIcon className="w-4 h-4 mr-2" />
                            Edit Assignments
                          </Button>
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  /* Empty state */
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                      <UserGroupIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No employees assigned to this application
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Employees can be assigned when editing this application
                    </p>
                    {canEdit && (
                      <Link href={`/applications/${applicationId}/edit`}>
                        <Button variant="primary" size="md">
                          <PencilIcon className="w-4 h-4 mr-2" />
                          Edit Application
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

              {/* Address Information */}
              {application.current_address && (
                <Card variant="elevated" padding="none" className="overflow-hidden hover:shadow-xl transition-all duration-300">
                  <SectionHeader
                    icon={<HomeIcon />}
                    title="Address Information"
                    khmerTitle="ព័ត៌មានអាសយដ្ឋាន"
                    variant="purple"
                  />
                  <CardContent className="p-8">
                    <InfoCard
                      icon={<HomeIcon />}
                      label="Current Address"
                      khmerLabel="អាសយដ្ឋានបច្ចុប្បន្ន"
                      value={application.current_address}
                      variant="primary"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Guarantor Information */}
              {(application.guarantor_name || application.guarantor_phone) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="px-8 py-6 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-2xl shadow-lg">
                        <UserGroupIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Guarantor Information
                        </h2>
                        <p className="text-base text-amber-600 dark:text-amber-400 font-medium">
                          ព័ត៌មានអ្នកធានា
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {application.guarantor_name && (
                        <div className="group relative p-6 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/20 rounded-2xl border border-amber-200 dark:border-amber-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-amber-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                              <UserIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Guarantor Name</p>
                                <div className="h-1 w-1 bg-amber-400 rounded-full"></div>
                              </div>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 font-medium">ឈ្មោះអ្នកធានា</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{application.guarantor_name}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {application.guarantor_phone && (
                        <div className="group relative p-6 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-800/20 rounded-2xl border border-orange-200 dark:border-orange-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-orange-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                              <PhoneIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Guarantor Phone</p>
                                <div className="h-1 w-1 bg-orange-400 rounded-full"></div>
                              </div>
                              <p className="text-xs text-orange-600 dark:text-orange-400 mb-3 font-medium">លេខទូរស័ព្ទអ្នកធានា</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">{application.guarantor_phone}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {application.guarantor_id_number && (
                        <div className="group relative p-6 bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/20 dark:to-pink-800/20 rounded-2xl border border-red-200 dark:border-red-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-red-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                              <IdentificationIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Guarantor ID</p>
                                <div className="h-1 w-1 bg-red-400 rounded-full"></div>
                              </div>
                              <p className="text-xs text-red-600 dark:text-red-400 mb-3 font-medium">លេខអត្តសញ្ញាណអ្នកធានា</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white font-mono tracking-wider">{application.guarantor_id_number}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {application.guarantor_address && (
                        <div className="group relative p-6 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-800/20 rounded-2xl border border-pink-200 dark:border-pink-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-pink-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                              <HomeIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="text-sm font-semibold text-pink-700 dark:text-pink-300 uppercase tracking-wide">Guarantor Address</p>
                                <div className="h-1 w-1 bg-pink-400 rounded-full"></div>
                              </div>
                              <p className="text-xs text-pink-600 dark:text-pink-400 mb-3 font-medium">អាសយដ្ឋានអ្នកធានា</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">{application.guarantor_address}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {application.guarantor_relationship && (
                        <div className="group relative p-6 bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/20 dark:to-red-800/20 rounded-2xl border border-rose-200 dark:border-rose-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-rose-500 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                              <UserGroupIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wide">Relationship</p>
                                <div className="h-1 w-1 bg-rose-400 rounded-full"></div>
                              </div>
                              <p className="text-xs text-rose-600 dark:text-rose-400 mb-3 font-medium">ទំនាក់ទំនងជាមួយអ្នកខ្ចី</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{application.guarantor_relationship}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Documents by Folder */}
              {(files.length > 0 || appFolders.length > 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="px-8 py-6 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 dark:from-teal-900/20 dark:via-cyan-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl shadow-lg">
                          <DocumentDuplicateIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            ឯកសារ (តាមថត)
                          </h2>
                          <p className="text-base text-teal-600 dark:text-teal-400 font-medium">
                            Documents by Folder ({files.length} files, {appFolders.length} folders)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    {/* Documents organized by folders */}
                    {appFolders.length > 0 ? (
                      <div className="space-y-8">
                        {appFolders.map((folder) => {
                          const folderFiles = files.filter(f => f.folder_id === folder.id);
                          const folderImages = folderFiles.filter(isImageFile);
                          const folderDocs = folderFiles.filter(f => !isImageFile(f));

                          if (folderFiles.length === 0) return null;

                          return (
                            <div key={folder.id} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                              {/* Folder Header */}
                              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-600">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-blue-500 rounded-lg shadow-md">
                                    <DocumentDuplicateIcon className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                      {folder.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {folderFiles.length} files ({folderImages.length} images, {folderDocs.length} documents)
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Folder Content */}
                              <div className="p-6">
                                {/* Images in this folder */}
                                {folderImages.length > 0 && (
                                  <div className="mb-6">
                                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                      រូបភាព ({folderImages.length})
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                      {folderImages.map((file) => (
                                        <div
                                          key={file.id}
                                          className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border border-gray-200 dark:border-gray-600"
                                          onClick={() => openPreview(file, folderImages)}
                                        >
                                          <ImageThumbnail
                                            file={file}
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                              <div className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg">
                                                <EyeIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                              </div>
                                            </div>
                                          </div>
                                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                            <p className="text-white text-xs font-medium truncate">
                                              {file.display_name || file.original_filename}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Documents in this folder */}
                                {folderDocs.length > 0 && (
                                  <div>
                                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                      ឯកសារ ({folderDocs.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {folderDocs.map((file) => (
                                        <div
                                          key={file.id}
                                          className="group flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-500 rounded-lg shadow-md">
                                              <DocumentTextIcon className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                {file.display_name || file.original_filename}
                                              </p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {file.mime_type} • {file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'Unknown size'}
                                              </p>
                                            </div>
                                          </div>
                                          <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => downloadFile(file.id, file.original_filename || 'document')}
                                            className="group/btn"
                                          >
                                            <ArrowDownTrayIcon className="w-3 h-3 mr-1.5" />
                                            <span className="font-medium">Download</span>
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Files not in any folder */}
                        {(() => {
                          const unorganizedFiles = files.filter(f => !f.folder_id);
                          if (unorganizedFiles.length === 0) return null;

                          return (
                            <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-orange-50 dark:from-gray-700 dark:to-orange-900/20 border-b border-gray-200 dark:border-gray-600">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-orange-500 rounded-lg shadow-md">
                                    <DocumentDuplicateIcon className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                      Other Files
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {unorganizedFiles.length} files not organized in folders
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="p-6">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {unorganizedFiles.filter(isImageFile).map((file) => (
                                    <div
                                      key={file.id}
                                      className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                                      onClick={() => openPreview(file, unorganizedFiles.filter(isImageFile))}
                                    >
                                      <ImageThumbnail
                                        file={file}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                          <div className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg">
                                            <EyeIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* Fallback: show all files when no folders exist */
                      <div className="space-y-6">
                        {files.filter(isImageFile).length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                              <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                              រូបភាព ({files.filter(isImageFile).length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {files.filter(isImageFile).map((file) => (
                                <div
                                  key={file.id}
                                  className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                                  onClick={() => openPreview(file, files.filter(isImageFile))}
                                >
                                  <ImageThumbnail
                                    file={file}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                      <div className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg">
                                        <EyeIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {files.filter(f => !isImageFile(f)).length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                              ឯកសារ ({files.filter(f => !isImageFile(f)).length})
                            </h3>
                            <div className="space-y-3">
                              {files.filter(f => !isImageFile(f)).map((file) => (
                                <div
                                  key={file.id}
                                  className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300"
                                >
                                  <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-blue-500 rounded-xl shadow-md">
                                      <DocumentTextIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {file.display_name || file.original_filename}
                                      </p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {file.mime_type} • {file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'Unknown size'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => downloadFile(file.id, file.original_filename || 'document')}
                                    className="group/btn flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                                  >
                                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                                    <span className="font-medium">Download</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {files.length === 0 && (
                          <div className="text-center py-12">
                            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl w-fit mx-auto mb-4">
                              <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                              មិនមានឯកសារដែលបានផ្ទុកឡើង
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status Card */}
              <Card variant="elevated" padding="md" className="hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-md mr-3">
                      <StatusIcon className="w-5 h-5 text-white" />
                    </div>
                    ស្ថានភាព
                  </h3>
                  <StatusBadge
                    status={application.status}
                    icon={<StatusIcon />}
                    label={config.khmer}
                    variant={
                      application.status === 'approved' ? 'success' :
                      application.status === 'rejected' ? 'error' :
                      application.status === 'submitted' || application.status === 'under_review' ? 'info' :
                      application.status === 'pending' ? 'warning' : 'default'
                    }
                    size="sm"
                  />
                </div>

                <div className="space-y-4">
                  <InfoCard
                    icon={<IdentificationIcon />}
                    label="លេខកូដ"
                    value={<span className="font-mono text-sm">{application.id}</span>}
                    variant="primary"
                    className="p-4"
                  />
                  <InfoCard
                    icon={<DocumentDuplicateIcon />}
                    label="ចំនួនឯកសារ"
                    value={`${files.length} ឯកសារ`}
                    variant="success"
                    className="p-4"
                  />
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ថ្ងៃកែប្រែចុងក្រោយ</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatDate(application.updated_at)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Officer Information */}
              <Card variant="elevated" padding="md" className="hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-md mr-3">
                    <BuildingOfficeIcon className="w-5 h-5 text-white" />
                  </div>
                  ព័ត៌មានមន្ត្រី
                </h3>
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">មិនមានព័ត៌មាន</p>
                </div>
              </Card>
            </div>
        
        <RejectModal
          showRejectModal={showRejectModal}
          setShowRejectModal={setShowRejectModal}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          handleReject={handleReject}
          rejectMutation={rejectMutation}
        />
    
        <FilePreviewModal
          previewFile={previewFile}
          setPreviewFile={setPreviewFile}
          previewList={previewList}
          previewIndex={previewIndex}
          navigatePreview={navigatePreview}
          appFolders={appFolders}
        />
      </div>
      </Layout>
    </ProtectedRoute>
  );
}

function RejectModal({
  showRejectModal,
  setShowRejectModal,
  rejectReason,
  setRejectReason,
  handleReject,
  rejectMutation
}: {
  showRejectModal: boolean;
  setShowRejectModal: (show: boolean) => void;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  handleReject: () => void;
  rejectMutation: any;
}) {
  if (!showRejectModal) return null;

  return (
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
  );
}

function FilePreviewModal({
  previewFile,
  setPreviewFile,
  previewList,
  previewIndex,
  navigatePreview,
  appFolders
}: {
  previewFile: ApiFile | null;
  setPreviewFile: (file: ApiFile | null) => void;
  previewList: ApiFile[];
  previewIndex: number;
  navigatePreview: (direction: 'prev' | 'next') => void;
  appFolders: any[];
}) {
  if (!previewFile) return null;

  return (
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
  );
}

function ApplicationDetailPage() {
  return (
    <CurrencyProvider>
      <ApplicationDetailContent />
    </CurrencyProvider>
  );
}

export default ApplicationDetailPage;