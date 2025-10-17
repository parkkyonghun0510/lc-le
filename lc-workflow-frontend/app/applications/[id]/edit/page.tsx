'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplication, useUpdateApplication } from '@/hooks/useApplications';
import { useUploadFile } from '@/hooks/useFiles';
import { toast } from 'react-hot-toast';
import { useProductTypes, useIDCardTypes } from '@/hooks/useEnums';
import { useApplicationAssignments } from '@/hooks/useEmployeeAssignments';
import { EmployeeSelector } from '@/components/employees/EmployeeSelector';
import { EmployeeAssignmentCreate } from '@/types/models';
import { useAuth } from '@/hooks/useAuth';
import { AddressField } from '../../../applications/new/components/AddressField';


import { getIDNumberPlaceholder } from '@/utils/idCardHelpers';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  PhotoIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

// Import validation utilities (assuming they exist or need to be created)
const validateFormData = (formData: any) => {
  const errors: string[] = [];

  // Required fields validation
  if (!formData.full_name_khmer?.trim()) {
    errors.push('ឈ្មោះជាភាសាខ្មែរត្រូវតែបំពេញ');
  }

  if (!formData.full_name_latin?.trim()) {
    errors.push('ឈ្មោះជាអក្សរឡាតាំងត្រូវតែបំពេញ');
  }

  if (!formData.phone?.trim()) {
    errors.push('លេខទូរស័ព្ទត្រូវតែបំពេញ');
  }

  if (!formData.id_card_type) {
    errors.push('ប្រភេទប័ណ្ណត្រូវតែជ្រើសរើស');
  }

  if (!formData.id_number?.trim()) {
    errors.push('លេខប័ណ្ណត្រូវតែបំពេញ');
  }

  if (!formData.requested_amount || parseFloat(formData.requested_amount) <= 0) {
    errors.push('ចំនួនទឹកប្រាក់ស្នើសុំត្រូវតែធំជាង 0');
  }

  if (!formData.product_type) {
    errors.push('ប្រភេទផលិតផលត្រូវតែជ្រើសរើស');
  }

  // Phone number format validation
  if (formData.phone && !/^[0-9\s\-\+\(\)]+$/.test(formData.phone)) {
    errors.push('លេខទូរស័ព្ទមិនត្រឹមត្រូវ');
  }

  // Guarantor phone validation if guarantor name is provided
  if (formData.guarantor_name?.trim() && formData.guarantor_phone && !/^[0-9\s\-\+\(\)]+$/.test(formData.guarantor_phone)) {
    errors.push('លេខទូរស័ព្ទអ្នកធានាមិនត្រឹមត្រូវ');
  }

  return { isValid: errors.length === 0, errors };
};

export default function EditApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;

  const { data: application, isLoading, error } = useApplication(applicationId);
  // TODO: Replace with static options or new data source
  const { data: idCardTypes, isLoading: isLoadingIdCardTypes } = useIDCardTypes();
  const { data: productTypes, isLoading: isLoadingProductTypes } = useProductTypes();
  const updateMutation = useUpdateApplication();
  const uploadMutation = useUploadFile();
  const { user } = useAuth();
  const { data: existingAssignments } = useApplicationAssignments(applicationId);

  const [formData, setFormData] = useState({
    full_name_khmer: '',
    full_name_latin: '',
    phone: '',
    id_card_type: '',
    id_number: '',
    date_of_birth: '',
    portfolio_officer_name: '',
    requested_amount: '',
    product_type: '',
    desired_loan_term: 0,
    accountId: '',
    requested_disbursement_date: '',
    purpose_details: '',
    guarantor_name: '',
    guarantor_phone: '',
    guarantor_id_number: '',
    guarantor_address: '',
    guarantor_relationship: '',
    current_address: '',
    province: '',
    district: '',
    commune: '',
    village: '',
    sex: '',
    marital_status: '',
    loan_purposes: [] as string[],
    collaterals: [] as any[],
    employee_assignments: [] as EmployeeAssignmentCreate[],
  });

  const docDefs = [
    { id: 'borrower_photo', label: 'រូបថតអ្នកខ្ចី', role: 'borrower' },
    { id: 'borrower_nid_front', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកខ្ចី (មុខ)', role: 'borrower' },
    { id: 'guarantor_photo', label: 'រូបថតអ្នកធានា', role: 'guarantor' },
    { id: 'guarantor_nid_front', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកធានា (មុខ)', role: 'guarantor' },
    { id: 'driver_license', label: 'បណ្ណបើកបរ', role: 'borrower' },
    { id: 'passport', label: 'លិខិតឆ្លងដែន', role: 'borrower' },
    { id: 'business_license', label: 'អាជ្ញាបណ្ណអាជីវកម្ម', role: 'borrower' },
    { id: 'land_title', label: 'បណ្ណកម្មសិទ្ធិដី', role: 'collateral' },
    { id: 'house_photo', label: 'រូបផ្ទះ', role: 'collateral' },
    { id: 'collateral_other', label: 'បញ្ចាំផ្សេងៗ', role: 'collateral' },
  ];

  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
  const [docFiles, setDocFiles] = useState<Record<string, File[]>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Get dynamic placeholder for ID number based on selected ID card type
  const idNumberPlaceholder = useMemo(() => {
    return getIDNumberPlaceholder(formData?.id_card_type || '');
  }, [formData?.id_card_type]);

  useEffect(() => {
    if (!application) return;
    setFormData({
      full_name_khmer: application.full_name_khmer || '',
      full_name_latin: application.full_name_latin || '',
      phone: application.phone || '',
      id_card_type: application.id_card_type || '',
      id_number: application.id_number || '',
      date_of_birth: application.date_of_birth ? application.date_of_birth.slice(0, 10) : '',
      portfolio_officer_name: application.portfolio_officer_name || '',
      requested_amount: application.requested_amount?.toString() || '',
      product_type: application.product_type || '',
      desired_loan_term: application.desired_loan_term || 1,
      requested_disbursement_date: application.requested_disbursement_date ? application.requested_disbursement_date.slice(0, 10) : '',
      purpose_details: application.purpose_details || '',
      guarantor_name: application.guarantor_name || '',
      guarantor_phone: application.guarantor_phone || '',
      guarantor_id_number: application.guarantor_id_number || '',
      guarantor_address: application.guarantor_address || '',
      guarantor_relationship: application.guarantor_relationship || '',
      current_address: application.current_address || '',
      province: application.province || '',
      district: application.district || '',
      commune: application.commune || '',
      village: application.village || '',
      sex: application.sex || '',
      marital_status: application.marital_status || '',
      accountId: application.account_id || '',
      loan_purposes: Array.isArray(application.loan_purposes) ? application.loan_purposes : [],
      collaterals: Array.isArray(application.collaterals) ? application.collaterals : [],
      employee_assignments: [],
    });
  }, [application]);

  // Load existing employee assignments
  useEffect(() => {
    if (existingAssignments && existingAssignments.length > 0) {
      const assignments: EmployeeAssignmentCreate[] = existingAssignments.map(assignment => ({
        employee_id: assignment.employee_id,
        assignment_role: assignment.assignment_role,
        notes: assignment.notes || '',
      }));
      setFormData(prev => ({ ...prev, employee_assignments: assignments }));
    }
  }, [existingAssignments]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate form data before saving
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    const payload: any = {
      ...formData,
      requested_amount: formData.requested_amount ? parseFloat(formData.requested_amount) : undefined,
      desired_loan_term: formData.desired_loan_term ? Number(formData.desired_loan_term) : undefined,
      date_of_birth: formData.date_of_birth || undefined,
      account_id: formData.accountId || undefined,
      requested_disbursement_date: formData.requested_disbursement_date || undefined,
      // Additional fields from create page
      current_address: formData.current_address || undefined,
      province: formData.province || undefined,
      district: formData.district || undefined,
      commune: formData.commune || undefined,
      village: formData.village || undefined,
      sex: formData.sex || undefined,
      marital_status: formData.marital_status || undefined,
      guarantor_id_number: formData.guarantor_id_number || undefined,
      guarantor_address: formData.guarantor_address || undefined,
      guarantor_relationship: formData.guarantor_relationship || undefined,
      employee_assignments: formData.employee_assignments,
    };

    // Remove empty strings to avoid overwriting with blanks
    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') delete payload[k];
    });

    try {
      await updateMutation.mutateAsync({ id: applicationId, data: payload });
      toast.success('ព័ត៌មានត្រូវបានកែប្រែដោយជោគជ័យ');

      // Upload any newly selected files and append to documents
      const uploads: any[] = [];
      for (const def of docDefs) {
        if (!selectedDocs[def.id]) continue;
        const files = docFiles[def.id] || [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const key = `${def.id}-${i}-${f.name}`;
          setUploadProgress(prev => ({ ...prev, [key]: 0 }));
          const uploaded = await uploadMutation.mutateAsync({
            file: f,
            applicationId,
            onProgress: (p: number) => setUploadProgress(prev => ({ ...prev, [key]: p }))
          });
          uploads.push({
            type: def.id,
            role: def.role,
            file_id: uploaded.id,
            filename: uploaded.filename,
            original_filename: uploaded.original_filename,
            display_name: uploaded.display_name,
            mime_type: uploaded.mime_type,
            size: uploaded.file_size,
            uploaded_at: uploaded.created_at,
          });
          setUploadProgress(prev => ({ ...prev, [key]: 100 }));
        }
      }

      if (uploads.length > 0) {
        const existingDocs = Array.isArray((application as any).documents) ? (application as any).documents : [];
        await updateMutation.mutateAsync({ id: applicationId, data: { documents: [...existingDocs, ...uploads] } });
        toast.success('ឯកសារត្រូវបានបន្ថែមដោយជោគជ័យ');
      }

      router.push(`/applications/${applicationId}`);
    } catch (error) {
      console.error('Failed to update application:', error);
      toast.error('មានបញ្ហាក្នុងការកែប្រែព័ត៌មាន');
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse space-y-8">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                <div className="h-8 bg-gray-200 rounded w-1/3" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-96 bg-gray-200 rounded-xl" />
                  <div className="h-64 bg-gray-200 rounded-xl" />
                </div>
                <div className="space-y-6">
                  <div className="h-48 bg-gray-200 rounded-xl" />
                  <div className="h-32 bg-gray-200 rounded-xl" />
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-16">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">រកមិនឃើញពាក្យសុំ</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">ពាក្យសុំដែលអ្នកកំពុងស្វែងរកមិនអាចរកឃើញទេ។</p>
              <Link
                href={`/applications/${applicationId}`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                ត្រលប់ទៅកាន់ពាក្យសុំ
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Enhanced Header Section */}
            <div className="mb-12 text-center">
              <div className="flex items-center justify-center mb-6">
                <button
                  onClick={() => router.back()}
                  className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 mr-6"
                >
                  <ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                កែប្រែពាក្យស្នើសុំដាក់បញ្ចាំ និងប្រាកិភោគដោយអនុប្បទាន
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">កែប្រែព័ត៌មានពាក្យសុំកម្ចី</p>
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                <InformationCircleIcon className="w-4 h-4 mr-2" />
                ID: {applicationId.slice(0, 8)}...
              </div>
            </div>

            {/* Enhanced Form Content Container */}
            <div className="relative mb-10">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-3xl transform rotate-1"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-purple-600/5 to-pink-600/5 rounded-3xl transform -rotate-1"></div>

              {/* Main Content Grid */}
              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Main Form */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Borrower Information Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ព័ត៌មានអ្នកខ្ចី</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">ព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកខ្ចី</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ឈ្មោះជាភាសាខ្មែរ</label>
                            <input
                              value={formData.full_name_khmer}
                              onChange={(e) => handleChange('full_name_khmer', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="បញ្ចូលឈ្មោះជាភាសាខ្មែរ"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ឈ្មោះជាអក្សរឡាតាំង</label>
                            <input
                              value={formData.full_name_latin}
                              onChange={(e) => handleChange('full_name_latin', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="Enter name in Latin"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">លេខទូរស័ព្ទ</label>
                            <input
                              value={formData.phone}
                              onChange={(e) => handleChange('phone', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="012 345 678"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ប្រភេទប័ណ្ណ</label>
                            <select
                              value={formData.id_card_type}
                              onChange={(e) => handleChange('id_card_type', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              disabled={isLoadingIdCardTypes}
                            >
                              <option value="">ជ្រើសរើសប្រភេទប័ណ្ណ</option>
                              {idCardTypes?.map((type) => (
                                <option key={type.value} value={type.value}>{type.label || type.value}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              {idCardTypes?.find(type => type.value === formData.id_card_type)?.label_khmer ||
                                idCardTypes?.find(type => type.value === formData.id_card_type)?.value || 'លេខប័ណ្ណ'}
                            </label>
                            <input
                              value={formData.id_number}
                              onChange={(e) => handleChange('id_number', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder={idNumberPlaceholder}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ថ្ងៃខែឆ្នាំកំណើត</label>
                            <div className="relative">
                              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                                max={(() => {
                                  const date = new Date();
                                  date.setFullYear(date.getFullYear() - 18);
                                  return date.toISOString().split('T')[0];
                                })()}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ភេទ</label>
                            <select
                              value={formData.sex}
                              onChange={(e) => handleChange('sex', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                            >
                              <option value="">ជ្រើសរើសភេទ</option>
                              <option value="male">ប្រុស</option>
                              <option value="female">ស្រី</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ស្ថានភាពគ្រួសារ</label>
                            <select
                              value={formData.marital_status}
                              onChange={(e) => handleChange('marital_status', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                            >
                              <option value="">ជ្រើសរើសស្ថានភាពគ្រួសារ</option>
                              <option value="single">នៅលីវ</option>
                              <option value="married">រៀបការ</option>
                              <option value="divorced">លែងលះ</option>
                              <option value="widowed">ម្មាយ</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-6">
                          <AddressField
                            label="អាសយដ្ឋានបច្ចុប្បន្ន"
                            name="current_address"
                            value={formData.current_address}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('current_address', e.target.value)}
                            onAddressDataChange={(addressData: any) => {
                              handleChange('province', addressData.province || '');
                              handleChange('district', addressData.district || '');
                              handleChange('commune', addressData.commune || '');
                              handleChange('village', addressData.village || '');
                            }}
                            initialAddress={{
                              province: formData.province,
                              district: formData.district,
                              commune: formData.commune,
                              village: formData.village,
                            }}
                            placeholder="ជ្រើសរើសអាសយដ្ឋាន"
                          />
                        </div>

                        {/* Employee Assignment Section */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                            Employee Assignment
                          </h4>
                          
                          {/* Show migration alert if using legacy portfolio officer and no employee assignments */}
                          {!application?.portfolio_officer_migrated && 
                           formData.portfolio_officer_name && 
                           (!existingAssignments || existingAssignments.length === 0) &&
                           (!formData.employee_assignments || formData.employee_assignments.length === 0) && (
                            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <div className="flex items-start">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                                    Legacy Portfolio Officer
                                  </h5>
                                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                                    This application uses legacy portfolio officer name: <strong>{formData.portfolio_officer_name}</strong>. 
                                    Consider migrating to employee assignments for better tracking.
                                  </p>
                                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                                    💡 Tip: Add employee assignments above, then you can clear the legacy field below.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <EmployeeSelector
                            value={formData.employee_assignments}
                            onChange={(assignments) => {
                              setFormData(prev => ({ ...prev, employee_assignments: assignments }));
                            }}
                            branchId={user?.branch_id}
                            allowMultiple={true}
                          />

                          {/* Keep legacy field for backward compatibility */}
                          <div className="mt-4 space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              មន្ត្រីទទួលបន្ទុក (Legacy)
                            </label>
                            <input
                              value={formData.portfolio_officer_name}
                              onChange={(e) => handleChange('portfolio_officer_name', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="បញ្ចូលឈ្មោះមន្ត្រីទទួលបន្ទុក"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              This field is kept for backward compatibility. Use employee assignments above instead.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loan Information Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg">
                            <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ព័ត៌មានកម្ចី</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">ព័ត៌មានលម្អិតអំពីកម្ចី</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ប្រភេទផលិតផល</label>
                            <select
                              value={formData.product_type}
                              onChange={(e) => handleChange('product_type', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              disabled={isLoadingProductTypes}
                            >
                              <option value="">ជ្រើសរើសប្រភេទផលិតផល</option>
                              {productTypes?.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label || type.value}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ចំនួនបង់(ដង)</label>
                            <input
                              type="number"
                              min="1"
                              max="360"
                              value={formData.desired_loan_term}
                              onChange={(e) => handleChange('desired_loan_term', Math.max(1, Number(e.target.value) || 1))}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="12 ខែ"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">លេខគណនីកម្ចី (PMS Account Id)</label>
                            <input
                              type="text"
                              value={formData.accountId}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and limit to 8 characters
                                const numericValue = value.replace(/\D/g, '').slice(0, 8);
                                handleChange('accountId', numericValue);
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value) {
                                  // Pad with leading zeros to 8 characters when field loses focus
                                  const paddedValue = value.padStart(8, '0');
                                  handleChange('accountId', paddedValue);
                                }
                              }}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200 font-mono"
                              placeholder="Enter account ID"
                            />
                            {formData.accountId && formData.accountId.length < 8 && (
                              <p className="text-sm text-gray-500">
                                Will be saved as: <span className="font-mono font-semibold text-blue-600">{formData.accountId.padStart(8, '0')}</span>
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ចំនួនទឹកប្រាក់ស្នើសុំ (KHR ៛)</label>
                            <input
                              type="number"
                              value={formData.requested_amount}
                              onChange={(e) => handleChange('requested_amount', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="1,000,000"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">កាលបរិច្ឆេទចង់បានប្រាក់</label>
                            <input
                              type="date"
                              value={formData.requested_disbursement_date}
                              onChange={(e) => handleChange('requested_disbursement_date', e.target.value)}
                              min={(() => {
                                const date = new Date();
                                date.setDate(date.getDate() + 1);
                                return date.toISOString().split('T')[0];
                              })()}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                            />
                          </div>
                        </div>
                        <div className="mt-6 space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ព័ត៌មានលម្អិតអំពីគោលបំណង</label>
                          <textarea
                            rows={4}
                            value={formData.purpose_details}
                            onChange={(e) => handleChange('purpose_details', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                            placeholder="បញ្ជាក់ពីគោលបំណងនៃការប្រើប្រាស់ប្រាក់កម្ចី..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Guarantor Information Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <ShieldCheckIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ព័ត៌មានអ្នកធានា</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">ព័ត៌មានអ្នកធានាសម្រាប់កម្ចី</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ឈ្មោះអ្នកធានា</label>
                            <input
                              value={formData.guarantor_name}
                              onChange={(e) => handleChange('guarantor_name', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="បញ្ចូលឈ្មោះអ្នកធានា"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">លេខទូរស័ព្ទអ្នកធានា</label>
                            <input
                              value={formData.guarantor_phone}
                              onChange={(e) => handleChange('guarantor_phone', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="012 345 678"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">លេខប័ណ្ណអ្នកធានា</label>
                            <input
                              value={formData.guarantor_id_number}
                              onChange={(e) => handleChange('guarantor_id_number', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="បញ្ចូលលេខប័ណ្ណអ្នកធានា"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ទំនាក់ទំនងជាមួយអ្នកខ្ចី</label>
                            <input
                              value={formData.guarantor_relationship}
                              onChange={(e) => handleChange('guarantor_relationship', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                              placeholder="ឧ. បងប្អូន, មិត្តភក្តិ, ជាដើម"
                            />
                          </div>
                        </div>
                        <div className="mt-6 space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">អាសយដ្ឋានអ្នកធានា</label>
                          <textarea
                            rows={3}
                            value={formData.guarantor_address}
                            onChange={(e) => handleChange('guarantor_address', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                            placeholder="បញ្ចូលអាសយដ្ឋានអ្នកធានា..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Documents & Actions */}
                  <div className="space-y-6">
                    {/* Existing Documents */}
                    {application.documents && Array.isArray(application.documents) && application.documents.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-lg">
                              <DocumentTextIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ឯកសារដែលមាន</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{application.documents.length} ឯកសារ</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="space-y-3">
                            {application.documents.map((doc: any, index: number) => (
                              <div key={index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <DocumentTextIcon className="w-5 h-5 text-gray-400 mr-3" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.type}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{doc.display_name || doc.original_filename}</div>
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                                  {doc.role}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document Upload Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-lg">
                            <PhotoIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">បន្ថែមឯកសារ</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">ជ្រើសរើសឯកសារថ្មី</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-6">
                        {/* Borrower Documents */}
                        <div>
                          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">ឯកសារអ្នកខ្ចី</h4>
                          <div className="space-y-3">
                            {docDefs.filter(d => d.role === 'borrower').map((def) => (
                              <div key={def.id} className="space-y-2">
                                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200">
                                  <input
                                    type="checkbox"
                                    checked={selectedDocs[def.id] || false}
                                    onChange={(e) => setSelectedDocs(prev => ({ ...prev, [def.id]: e.target.checked }))}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{def.label}</span>
                                </label>
                                {selectedDocs[def.id] && (
                                  <div className="ml-6 space-y-2">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        setDocFiles(prev => ({ ...prev, [def.id]: files as File[] }));
                                      }}
                                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Guarantor Documents */}
                        <div>
                          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">ឯកសារអ្នកធានា</h4>
                          <div className="space-y-3">
                            {docDefs.filter(d => d.role === 'guarantor').map((def) => (
                              <div key={def.id} className="space-y-2">
                                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200">
                                  <input
                                    type="checkbox"
                                    checked={selectedDocs[def.id] || false}
                                    onChange={(e) => setSelectedDocs(prev => ({ ...prev, [def.id]: e.target.checked }))}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{def.label}</span>
                                </label>
                                {selectedDocs[def.id] && (
                                  <div className="ml-6 space-y-2">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        setDocFiles(prev => ({ ...prev, [def.id]: files as File[] }));
                                      }}
                                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Collateral Documents */}
                        <div>
                          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">ឯកសារបញ្ចាំ</h4>
                          <div className="space-y-3">
                            {docDefs.filter(d => d.role === 'collateral').map((def) => (
                              <div key={def.id} className="space-y-2">
                                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200">
                                  <input
                                    type="checkbox"
                                    checked={selectedDocs[def.id] || false}
                                    onChange={(e) => setSelectedDocs(prev => ({ ...prev, [def.id]: e.target.checked }))}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{def.label}</span>
                                </label>
                                {selectedDocs[def.id] && (
                                  <div className="ml-6 space-y-2">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        setDocFiles(prev => ({ ...prev, [def.id]: files as File[] }));
                                      }}
                                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-6 space-y-3">
                          <button
                            onClick={handleSave}
                            disabled={updateMutation.isPending || uploadMutation.isPending}
                            className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                          >
                            {(updateMutation.isPending || uploadMutation.isPending) ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                កំពុងរក្សាទុក...
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                រក្សាទុកការផ្លាស់ប្តូរ
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => router.push(`/applications/${applicationId}`)}
                            className="w-full inline-flex items-center justify-center px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
                          >
                            <ArrowLeftIcon className="w-5 h-5 mr-2" />
                            ត្រលប់ដោយមិនរក្សាទុក
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtle inner glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="relative">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/30 p-6">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/applications/${applicationId}`}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    បោះបង់
                  </Link>

                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending || uploadMutation.isPending}
                    className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateMutation.isPending || uploadMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        កំពុងរក្សាទុក...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        រក្សាទុកការផ្លាស់ប្តូរ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Floating progress indicator */}
            <div className="fixed bottom-6 right-6 z-50">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full shadow-2xl border border-white/30 dark:border-gray-700/30 p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    កែប្រែ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}