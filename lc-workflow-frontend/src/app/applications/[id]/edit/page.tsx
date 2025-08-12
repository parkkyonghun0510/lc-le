'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplication, useUpdateApplication } from '@/hooks/useApplications';
import { useUploadFile } from '@/hooks/useFiles';
import { ArrowLeftIcon, CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

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
          // eslint-disable-next-line no-await-in-loop
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
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !application) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-2">រកមិនឃើញពាក្យសុំ</h2>
            <Link href={`/applications/${applicationId}`} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <ArrowLeftIcon className="w-4 h-4 mr-2" /> ត្រលប់
            </Link>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">កែប្រែពាក្យសុំ</h1>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ឈ្មោះជាភាសាខ្មែរ</label>
                <input value={formData.full_name_khmer} onChange={(e) => handleChange('full_name_khmer', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ឈ្មោះជាអក្សរឡាតាំង</label>
                <input value={formData.full_name_latin} onChange={(e) => handleChange('full_name_latin', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">លេខទូរស័ព្ទ</label>
                <input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ប្រភេទអត្តសញ្ញាណប័ណ្ណ</label>
                <input value={formData.id_card_type} onChange={(e) => handleChange('id_card_type', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">លេខអត្តសញ្ញាណប័ណ្ណ</label>
                <input value={formData.id_number} onChange={(e) => handleChange('id_number', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ថ្ងៃខែឆ្នាំកំណើត</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ចំនួនទឹកប្រាក់ស្នើសុំ (KHR ៛)</label>
                <input type="number" value={formData.requested_amount} onChange={(e) => handleChange('requested_amount', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ប្រភេទផលិតផល</label>
                <input value={formData.product_type} onChange={(e) => handleChange('product_type', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">រយៈពេលកម្ចី</label>
                <input value={formData.desired_loan_term} onChange={(e) => handleChange('desired_loan_term', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">កាលបរិច្ឆេទចង់បានប្រាក់</label>
                <input type="date" value={formData.requested_disbursement_date} onChange={(e) => handleChange('requested_disbursement_date', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ព័ត៌មានលម្អិតអំពីគោលបំណង</label>
              <textarea rows={4} value={formData.purpose_details} onChange={(e) => handleChange('purpose_details', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          {/* Guarantor Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">ព័ត៌មានអ្នកធានា</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ឈ្មោះអ្នកធានា</label>
                <input value={formData.guarantor_name} onChange={(e) => handleChange('guarantor_name', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">លេខទូរស័ព្ទអ្នកធានា</label>
                <input value={formData.guarantor_phone} onChange={(e) => handleChange('guarantor_phone', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">ឯកសារនិងរូបថត</h3>
            
            {/* Existing Documents Display */}
            {application.documents && Array.isArray(application.documents) && application.documents.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3">ឯកសារដែលមានរួចហើយ:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {application.documents.map((doc: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="text-sm font-medium">{doc.type}</div>
                      <div className="text-xs text-gray-600">{doc.original_filename}</div>
                      <div className="text-xs text-gray-500">{doc.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Document Upload */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">បន្ថែមឯកសារថ្មី:</h4>
              
              {/* Borrower Documents */}
              <div className="border rounded-lg p-4">
                <h5 className="font-medium mb-3">ឯកសារអ្នកខ្ចី</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {docDefs.filter(d => d.role === 'borrower').map((def) => (
                    <div key={def.id} className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedDocs[def.id] || false}
                          onChange={(e) => setSelectedDocs(prev => ({ ...prev, [def.id]: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-sm">{def.label}</span>
                      </label>
                      {selectedDocs[def.id] && (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setDocFiles(prev => ({ ...prev, [def.id]: files as File[] }));
                            }}
                            className="w-full text-sm"
                          />
                          {Array.isArray(docFiles[def.id]) && docFiles[def.id].length > 0 && (
                            <>
                              {/* Compact summary of completed uploads */}
                              {(() => {
                                const completed = docFiles[def.id].filter((file, idx) => {
                                  const key = `${def.id}-${idx}-${file.name}`;
                                  return uploadProgress[key] === 100;
                                }).length;
                                return completed > 0 ? (
                                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    <span>{completed} uploaded</span>
                                  </div>
                                ) : null;
                              })()}
                              <div className="space-y-1">
                                {docFiles[def.id].map((file, idx) => {
                                  const key = `${def.id}-${idx}-${file.name}`;
                                  const progress = uploadProgress[key] ?? 0;
                                  return (
                                    <div key={key} className="text-xs text-gray-600">
                                      <div className="flex justify-between">
                                        <span className="truncate max-w-[70%]" title={file.name}>{file.name}</span>
                                        <span>{progress}%</span>
                                      </div>
                                      <div className="w-full h-2 bg-gray-200 rounded">
                                        <div className="h-2 bg-blue-600 rounded" style={{ width: `${progress}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Guarantor Documents */}
              <div className="border rounded-lg p-4">
                <h5 className="font-medium mb-3">ឯកសារអ្នកធានា</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {docDefs.filter(d => d.role === 'guarantor').map((def) => (
                    <div key={def.id} className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedDocs[def.id] || false}
                          onChange={(e) => setSelectedDocs(prev => ({ ...prev, [def.id]: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-sm">{def.label}</span>
                      </label>
                      {selectedDocs[def.id] && (
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setDocFiles(prev => ({ ...prev, [def.id]: files }));
                          }}
                          className="w-full text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Collateral Documents */}
              <div className="border rounded-lg p-4">
                <h5 className="font-medium mb-3">ឯកសារបញ្ចាំ</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {docDefs.filter(d => d.role === 'collateral').map((def) => (
                    <div key={def.id} className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedDocs[def.id] || false}
                          onChange={(e) => setSelectedDocs(prev => ({ ...prev, [def.id]: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-sm">{def.label}</span>
                      </label>
                      {selectedDocs[def.id] && (
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setDocFiles(prev => ({ ...prev, [def.id]: files }));
                          }}
                          className="w-full text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={updateMutation.isPending || uploadMutation.isPending} className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {(updateMutation.isPending || uploadMutation.isPending) ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
            </button>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}


