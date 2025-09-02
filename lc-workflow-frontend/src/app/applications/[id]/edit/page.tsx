'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplication, useUpdateApplication } from '@/hooks/useApplications';
import { useUploadFile } from '@/hooks/useFiles';
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function EditApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;

  const { data: application, isLoading, error } = useApplication(applicationId);
  const updateMutation = useUpdateApplication();
  const uploadMutation = useUploadFile();

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
    desired_loan_term: '',
    requested_disbursement_date: '',
    purpose_details: '',
    guarantor_name: '',
    guarantor_phone: '',
    loan_purposes: [] as string[],
    collaterals: [] as any[],
  });
  
  const docDefs = [
    { id: 'borrower_photo', label: 'រូបថតអ្នកខ្ចី', role: 'borrower' },
    { id: 'borrower_nid_front', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកខ្ចី (មុខ)', role: 'borrower' },
    { id: 'borrower_nid_back', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកខ្ចី (ក្រោយ)', role: 'borrower' },
    { id: 'guarantor_photo', label: 'រូបថតអ្នកធានា', role: 'guarantor' },
    { id: 'guarantor_nid_front', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកធានា (មុខ)', role: 'guarantor' },
    { id: 'guarantor_nid_back', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកធានា (ក្រោយ)', role: 'guarantor' },
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
      desired_loan_term: application.desired_loan_term || '',
      requested_disbursement_date: application.requested_disbursement_date ? application.requested_disbursement_date.slice(0, 10) : '',
      purpose_details: application.purpose_details || '',
      guarantor_name: application.guarantor_name || '',
      guarantor_phone: application.guarantor_phone || '',
      loan_purposes: Array.isArray(application.loan_purposes) ? application.loan_purposes : [],
      collaterals: Array.isArray(application.collaterals) ? application.collaterals : [],
    });
  }, [application]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const payload: any = {
      ...formData,
      requested_amount: formData.requested_amount ? parseFloat(formData.requested_amount) : undefined,
      date_of_birth: formData.date_of_birth || undefined,
      requested_disbursement_date: formData.requested_disbursement_date || undefined,
    };
    // Remove empty strings to avoid overwriting with blanks
    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') delete payload[k];
    });
    try {
      await updateMutation.mutateAsync({ id: applicationId, data: payload });
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
      }
      router.push(`/applications/${applicationId}`);
    } catch (e) {
      // toast handled in hook
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => router.back()} 
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">កែប្រែពាក្យសុំ</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">កែប្រែព័ត៌មានពាក្យសុំកម្ចី</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                  ID: {applicationId.slice(0, 8)}...
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ប្រភេទអត្តសញ្ញាណប័ណ្ណ</label>
                      <input 
                        value={formData.id_card_type} 
                        onChange={(e) => handleChange('id_card_type', e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200" 
                        placeholder="អត្តសញ្ញាណប័ណ្ណ"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">លេខអត្តសញ្ញាណប័ណ្ណ</label>
                      <input 
                        value={formData.id_number} 
                        onChange={(e) => handleChange('id_number', e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200" 
                        placeholder="123456789"
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
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200" 
                        />
                      </div>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ប្រភេទផលិតផល</label>
                      <input 
                        value={formData.product_type} 
                        onChange={(e) => handleChange('product_type', e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200" 
                        placeholder="កម្ចីអាជីវកម្ម"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">រយៈពេលកម្ចី</label>
                      <input 
                        value={formData.desired_loan_term} 
                        onChange={(e) => handleChange('desired_loan_term', e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200" 
                        placeholder="12 ខែ"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">កាលបរិច្ឆេទចង់បានប្រាក់</label>
                      <input 
                        type="date" 
                        value={formData.requested_disbursement_date} 
                        onChange={(e) => handleChange('requested_disbursement_date', e.target.value)} 
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
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{doc.original_filename}</div>
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
                              {Array.isArray(docFiles[def.id]) && docFiles[def.id].length > 0 && (
                                <div className="space-y-2">
                                  {docFiles[def.id].map((file, idx) => {
                                    const key = `${def.id}-${idx}-${file.name}`;
                                    const progress = uploadProgress[key] ?? 0;
                                    return (
                                      <div key={key} className="text-xs">
                                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                          <span className="truncate max-w-[70%]" title={file.name}>{file.name}</span>
                                          <span>{progress}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded">
                                          <div className="h-2 bg-blue-600 rounded transition-all duration-300" style={{ width: `${progress}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
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
                            <div className="ml-6">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  setDocFiles(prev => ({ ...prev, [def.id]: files }));
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
                            <div className="ml-6">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  setDocFiles(prev => ({ ...prev, [def.id]: files }));
                                }}
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col space-y-4">
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
      </Layout>
    </ProtectedRoute>
  );
}


