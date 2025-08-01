'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useCreateApplication } from '@/hooks/useApplications';
import {
  ArrowLeftIcon,
  UserIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  XMarkIcon,
  CalendarIcon,
  IdentificationIcon,
  PhoneIcon,
  BanknotesIcon,
  HomeIcon,
  TruckIcon,
  AcademicCapIcon,
  HeartIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';

const loanPurposes = [
  { id: 'business', label: 'អាជីវកម្ម', icon: BanknotesIcon },
  { id: 'agriculture', label: 'កសិកម្ម', icon: HomeIcon },
  { id: 'education', label: 'អប់រំ', icon: AcademicCapIcon },
  { id: 'housing', label: 'លំនៅដ្ឋាន', icon: HomeIcon },
  { id: 'vehicle', label: 'យានយន្ត', icon: TruckIcon },
  { id: 'medical', label: 'វេជ្ជសាស្ត្រ', icon: HeartIcon },
  { id: 'other', label: 'ផ្សេងៗ', icon: EllipsisHorizontalIcon }
];

const idCardTypes = [
  { value: 'national_id', label: 'អត្តសញ្ញាណប័ណ្ណជាតិ' },
  { value: 'passport', label: 'លិខិតឆ្លងដែន' },
  { value: 'family_book', label: 'សៀវភៅគ្រួសារ' }
];

const productTypes = [
  { value: 'micro_loan', label: 'កម្ចីខ្នាតតូច' },
  { value: 'sme_loan', label: 'កម្ចីអាជីវកម្មតូច និងមធ្យម' },
  { value: 'agriculture_loan', label: 'កម្ចីកសិកម្ម' },
  { value: 'housing_loan', label: 'កម្ចីលំនៅដ្ឋាន' },
  { value: 'education_loan', label: 'កម្ចីអប់រំ' }
];

const loanTerms = [
  { value: '6_months', label: '៦ ខែ' },
  { value: '12_months', label: '១២ ខែ' },
  { value: '18_months', label: '១៨ ខែ' },
  { value: '24_months', label: '២៤ ខែ' },
  { value: '36_months', label: '៣៦ ខែ' },
  { value: '48_months', label: '៤៨ ខែ' },
  { value: '60_months', label: '៦០ ខែ' }
];

export default function NewApplicationPage() {
  const router = useRouter();
  const createMutation = useCreateApplication();

  const [formData, setFormData] = useState({
    // Customer Information
    id_card_type: '',
    id_number: '',
    full_name_khmer: '',
    full_name_latin: '',
    phone: '',
    date_of_birth: '',
    portfolio_officer_name: '',

    // Loan Details
    requested_amount: '',
    loan_purposes: [] as string[],
    purpose_details: '',
    product_type: '',
    desired_loan_term: '',
    requested_disbursement_date: '',

    // Guarantor Information
    guarantor_name: '',
    guarantor_phone: '',

    // Additional data
    collaterals: [] as any[],
    documents: [] as any[]
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 1, title: 'ព័ត៌មានអតិថិជន', icon: UserIcon },
    { id: 2, title: 'ព័ត៌មានកម្ចី', icon: CurrencyDollarIcon },
    { id: 3, title: 'អ្នកធានា', icon: UserGroupIcon },
    { id: 4, title: 'ឯកសារ', icon: DocumentDuplicateIcon }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePurposeToggle = (purposeId: string) => {
    setFormData(prev => ({
      ...prev,
      loan_purposes: prev.loan_purposes.includes(purposeId)
        ? prev.loan_purposes.filter(p => p !== purposeId)
        : [...prev.loan_purposes, purposeId]
    }));
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.full_name_khmer && !formData.full_name_latin) {
          newErrors.full_name = 'សូមបញ្ជាក់ឈ្មោះ';
        }
        if (!formData.phone) {
          newErrors.phone = 'សូមបញ្ជាក់លេខទូរស័ព្ទ';
        }
        if (!formData.id_number) {
          newErrors.id_number = 'សូមបញ្ជាក់លេខអត្តសញ្ញាណប័ណ្ណ';
        }
        break;
      case 2:
        if (!formData.requested_amount) {
          newErrors.requested_amount = 'សូមបញ្ជាក់ចំនួនទឹកប្រាក់';
        }
        if (formData.loan_purposes.length === 0) {
          newErrors.loan_purposes = 'សូមជ្រើសរើសគោលបំណងយ៉ាងហោចណាស់មួយ';
        }
        if (!formData.product_type) {
          newErrors.product_type = 'សូមជ្រើសរើសប្រភេទផលិតផល';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(4, prev + 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    const submitData = {
      ...formData,
      requested_amount: formData.requested_amount ? parseFloat(formData.requested_amount) : undefined,
      date_of_birth: formData.date_of_birth || undefined,
      requested_disbursement_date: formData.requested_disbursement_date || undefined
    };

    try {
      const result = await createMutation.mutateAsync(submitData);
      router.push(`/applications/${result.id}`);
    } catch (error) {
      console.error('Error creating application:', error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <UserIcon className="w-6 h-6 mr-2 text-blue-600" />
              ព័ត៌មានអតិថិជន
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ឈ្មោះជាភាសាខ្មែរ *
                </label>
                <input
                  type="text"
                  value={formData.full_name_khmer}
                  onChange={(e) => handleInputChange('full_name_khmer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="បញ្ចូលឈ្មោះជាភាសាខ្មែរ"
                />
                {errors.full_name && <p className="text-red-600 text-sm mt-1">{errors.full_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ឈ្មោះជាអក្សរឡាតាំង
                </label>
                <input
                  type="text"
                  value={formData.full_name_latin}
                  onChange={(e) => handleInputChange('full_name_latin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter name in Latin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ប្រភេទអត្តសញ្ញាណប័ណ្ណ
                </label>
                <select
                  value={formData.id_card_type}
                  onChange={(e) => handleInputChange('id_card_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">ជ្រើសរើសប្រភេទ</option>
                  {idCardTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  លេខអត្តសញ្ញាណប័ណ្ណ *
                </label>
                <div className="relative">
                  <IdentificationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.id_number}
                    onChange={(e) => handleInputChange('id_number', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="បញ្ចូលលេខអត្តសញ្ញាណប័ណ្ណ"
                  />
                </div>
                {errors.id_number && <p className="text-red-600 text-sm mt-1">{errors.id_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  លេខទូរស័ព្ទ *
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="បញ្ចូលលេខទូរស័ព្ទ"
                  />
                </div>
                {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ថ្ងៃខែឆ្នាំកំណើត
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ឈ្មោះមន្ត្រីទទួលបន្ទុក
                </label>
                <input
                  type="text"
                  value={formData.portfolio_officer_name}
                  onChange={(e) => handleInputChange('portfolio_officer_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="បញ្ចូលឈ្មោះមន្ត្រីទទួលបន្ទុក"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <CurrencyDollarIcon className="w-6 h-6 mr-2 text-green-600" />
              ព័ត៌មានកម្ចី
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ចំនួនទឹកប្រាក់ស្នើសុំ (USD) *
                </label>
                <input
                  type="number"
                  value={formData.requested_amount}
                  onChange={(e) => handleInputChange('requested_amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {errors.requested_amount && <p className="text-red-600 text-sm mt-1">{errors.requested_amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  រយៈពេលកម្ចី
                </label>
                <select
                  value={formData.desired_loan_term}
                  onChange={(e) => handleInputChange('desired_loan_term', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">ជ្រើសរើសរយៈពេល</option>
                  {loanTerms.map(term => (
                    <option key={term.value} value={term.value}>{term.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ប្រភេទផលិតផល *
                </label>
                <select
                  value={formData.product_type}
                  onChange={(e) => handleInputChange('product_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">ជ្រើសរើសប្រភេទផលិតផល</option>
                  {productTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {errors.product_type && <p className="text-red-600 text-sm mt-1">{errors.product_type}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  កាលបរិច្ឆេទចង់បានប្រាក់
                </label>
                <input
                  type="date"
                  value={formData.requested_disbursement_date}
                  onChange={(e) => handleInputChange('requested_disbursement_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                គោលបំណងប្រើប្រាស់ *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {loanPurposes.map(purpose => {
                  const Icon = purpose.icon;
                  const isSelected = formData.loan_purposes.includes(purpose.id);
                  return (
                    <button
                      key={purpose.id}
                      type="button"
                      onClick={() => handlePurposeToggle(purpose.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">{purpose.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.loan_purposes && <p className="text-red-600 text-sm mt-1">{errors.loan_purposes}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ព័ត៌មានលម្អិតអំពីគោលបំណង
              </label>
              <textarea
                value={formData.purpose_details}
                onChange={(e) => handleInputChange('purpose_details', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="សូមពិពណ៌នាលម្អិតអំពីគោលបំណងប្រើប្រាស់ប្រាក់កម្ចី..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <UserGroupIcon className="w-6 h-6 mr-2 text-purple-600" />
              ព័ត៌មានអ្នកធានា
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ព័ត៌មានអ្នកធានាមិនចាំបាច់ទេ ប៉ុន្តែវាអាចជួយបង្កើនឱកាសអនុម័តកម្ចីរបស់អ្នក។
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ឈ្មោះអ្នកធានា
                </label>
                <input
                  type="text"
                  value={formData.guarantor_name}
                  onChange={(e) => handleInputChange('guarantor_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="បញ្ចូលឈ្មោះអ្នកធានា"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  លេខទូរស័ព្ទអ្នកធានា
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.guarantor_phone}
                    onChange={(e) => handleInputChange('guarantor_phone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="បញ្ចូលលេខទូរស័ព្ទអ្នកធានា"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DocumentDuplicateIcon className="w-6 h-6 mr-2 text-orange-600" />
              ឯកសារភ្ជាប់
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                អ្នកអាចភ្ជាប់ឯកសារបន្ទាប់ពីបង្កើតពាក្យសុំរួចរាល់។ ឯកសារដែលត្រូវការ៖ អត្តសញ្ញាណប័ណ្ណ, វិក្កយបត្រប្រាក់ខែ, ឯកសារកម្មសិទ្ធិ។
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">មិនទាន់មានឯកសារ</h3>
              <p className="mt-1 text-sm text-gray-500">
                អ្នកនឹងអាចភ្ជាប់ឯកសារបន្ទាប់ពីបង្កើតពាក្យសុំ
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">បង្កើតពាក្យសុំកម្ចីថ្មី</h1>
              <p className="text-gray-600">បំពេញព័ត៌មានដើម្បីដាក់ស្នើសុំកម្ចី</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isActive
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isCompleted
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 text-gray-400'
                      }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                        }`}>
                        {step.title}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'
                        }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-lg shadow p-6">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between bg-white rounded-lg shadow p-6">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              ថយក្រោយ
            </button>

            <div className="flex space-x-3">
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  បន្ទាប់
                  <ArrowLeftIcon className="w-4 h-4 ml-2 rotate-180" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      កំពុងបង្កើត...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      បង្កើតពាក្យសុំ
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}