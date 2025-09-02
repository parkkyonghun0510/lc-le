'use client';

import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  useCreateApplication,
  useUpdateApplication,
} from '@/hooks/useApplications';
import { useApplicationFiles, useUploadFile } from '@/hooks/useFiles';
import FileUploadModal from '@/components/files/FileUploadModal';
import { File as ApiFile, ApplicationStatus } from '@/types/models';
import {
  UserIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CloudArrowUpIcon,
  TrashIcon,
  IdentificationIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  BanknotesIcon,
  ClockIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Define types locally
type LoanPurpose = 'Business' | 'Personal' | 'Other';
type ProductType = 'Personal Loan' | 'Business Loan';
type IDCardType = 'National ID' | 'Passport' | 'Driving License';
type LoanTerm = '3 Months' | '6 Months' | '12 Months' | '24 Months';
type DocumentType = 'photos' | 'references' | 'supporting_docs';

const loanPurposes: LoanPurpose[] = ['Business', 'Personal', 'Other'];
const productTypes: ProductType[] = ['Personal Loan', 'Business Loan'];
const idCardTypes: IDCardType[] = [
  'National ID',
  'Passport',
  'Driving License',
];
const loanTerms: LoanTerm[] = ['3 Months', '6 Months', '12 Months', '24 Months'];

interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
}

const documentTypes: DocumentTypeInfo[] = [
  { type: 'photos', label: 'Photos' },
  { type: 'references', label: 'References' },
  { type: 'supporting_docs', label: 'Supporting Documents' },
];

const steps = [
  {
    id: 0,
    title: 'Customer Information',
    description: 'Basic customer details',
    icon: UserIcon,
  },
  {
    id: 1,
    title: 'Loan Information',
    description: 'Loan amount and terms',
    icon: CurrencyDollarIcon,
  },
  {
    id: 2,
    title: 'Guarantor Information',
    description: 'Guarantor details',
    icon: UserGroupIcon,
  },
  {
    id: 3,
    title: 'Document Attachment',
    description: 'Upload required documents',
    icon: DocumentTextIcon,
  },
];

const NewApplicationPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<DocumentType>('photos');

  const [formValues, setFormValues] = useState({
    customer_name: '',
    id_card_type: '' as IDCardType,
    id_card_number: '',
    phone_number: '',
    email: '',
    address: '',
    requested_amount: '',
    loan_term: '' as LoanTerm,
    product_type: '' as ProductType,
    disbursement_date: '',
    loan_purpose: '' as LoanPurpose,
    loan_purpose_details: '',
    guarantor_name: '',
    guarantor_phone_number: '',
  });

  const createApplicationMutation = useCreateApplication();
  const updateApplicationMutation = useUpdateApplication();
  const uploadFileMutation = useUploadFile();

  const { data: files, isLoading: isLoadingFiles } = useApplicationFiles(
    applicationId || '',
    {}
  );

  const uploadedFiles = useMemo(() => files?.items || [], [files]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const validateStep = () => {
    switch (activeStep) {
      case 0:
        return formValues.customer_name && formValues.id_card_type && formValues.id_card_number && formValues.phone_number;
      case 1:
        return formValues.requested_amount && formValues.loan_term && formValues.product_type && formValues.disbursement_date && formValues.loan_purpose;
      case 2:
        return true; // Guarantor is optional
      case 3:
        return true; // Documents can be uploaded later
      default:
        return true;
    }
  };

  const createDraftApplication = async () => {
    try {
      const data = await createApplicationMutation.mutateAsync({
        status: 'draft',
        customer_name: formValues.customer_name,
        id_card_type: formValues.id_card_type,
        id_card_number: formValues.id_card_number,
        phone_number: formValues.phone_number,
        email: formValues.email,
        address: formValues.address,
      } as any);
      setApplicationId(data.id);
      toast.success('Application draft created successfully');
      return data.id;
    } catch (error) {
      console.error('Failed to create draft application', error);
      toast.error('Failed to create application draft');
      return null;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) {
      toast.error('Please fill in all required fields');
      return;
    }

    let currentApplicationId = applicationId;
    if (activeStep === 0 && !currentApplicationId) {
      currentApplicationId = await createDraftApplication();
      if (!currentApplicationId) return;
    }

    if (activeStep === 1 && currentApplicationId) {
      try {
        await updateApplicationMutation.mutateAsync({
          id: currentApplicationId,
          data: {
            requested_amount: parseFloat(formValues.requested_amount),
            loan_term: formValues.loan_term,
            product_type: formValues.product_type,
            disbursement_date: formValues.disbursement_date,
            loan_purpose: formValues.loan_purpose,
            loan_purpose_details: formValues.loan_purpose_details,
          } as any,
        });
        toast.success('Loan information saved');
      } catch (error) {
        console.error('Failed to update application', error);
        toast.error('Failed to save loan information');
        return;
      }
    }

    if (activeStep === 2 && currentApplicationId) {
      try {
        await updateApplicationMutation.mutateAsync({
          id: currentApplicationId,
          data: {
            guarantor_name: formValues.guarantor_name,
            guarantor_phone: formValues.guarantor_phone_number,
          },
        });
        toast.success('Guarantor information saved');
      } catch (error) {
        console.error('Failed to update guarantor information', error);
        toast.error('Failed to save guarantor information');
        return;
      }
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handlePrevious = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!applicationId) return;
    try {
      await updateApplicationMutation.mutateAsync({
        id: applicationId,
        data: { status: 'submitted' },
      });
      toast.success('Application submitted successfully!');
      // Handle successful submission (e.g., redirect or show success message)
    } catch (error) {
      console.error('Failed to submit application', error);
      toast.error('Failed to submit application');
    }
  };

  const handleOpenModal = (docType: DocumentType) => {
    setSelectedDocumentType(docType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customer Name *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    name="customer_name"
                    value={formValues.customer_name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    placeholder="Enter customer name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID Card Type *
                </label>
                <div className="relative">
                  <IdentificationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <select
                    name="id_card_type"
                    value={formValues.id_card_type}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white dark:bg-gray-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500"
                    required
                  >
                    <option value="">Select ID card type</option>
                    {idCardTypes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID Card Number *
                </label>
                <div className="relative">
                  <IdentificationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    name="id_card_number"
                    value={formValues.id_card_number}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    placeholder="Enter ID card number"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="tel"
                    name="phone_number"
                    value={formValues.phone_number}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="email"
                    name="email"
                    value={formValues.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    name="address"
                    value={formValues.address}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    placeholder="Enter address"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requested Amount *
                </label>
                <div className="relative">
                  <BanknotesIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="number"
                    name="requested_amount"
                    value={formValues.requested_amount}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    placeholder="Enter requested amount"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Loan Term *
                </label>
                <div className="relative">
                  <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <select
                    name="loan_term"
                    value={formValues.loan_term}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white dark:bg-gray-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500"
                    required
                  >
                    <option value="">Select loan term</option>
                    {loanTerms.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Type *
                </label>
                <div className="relative">
                  <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <select
                    name="product_type"
                    value={formValues.product_type}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white dark:bg-gray-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500"
                    required
                  >
                    <option value="">Select product type</option>
                    {productTypes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Disbursement Date *
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="date"
                    name="disbursement_date"
                    value={formValues.disbursement_date}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Loan Purpose *
                </label>
                <div className="relative">
                  <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <select
                    name="loan_purpose"
                    value={formValues.loan_purpose}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white dark:bg-gray-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500"
                    required
                  >
                    <option value="">Select loan purpose</option>
                    {loanPurposes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Loan Purpose Details
              </label>
              <textarea
                name="loan_purpose_details"
                value={formValues.loan_purpose_details}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 resize-none hover:border-gray-400 dark:hover:border-gray-500"
                placeholder="Provide additional details about the loan purpose"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Guarantor Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    name="guarantor_name"
                    value={formValues.guarantor_name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    placeholder="Enter guarantor name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Guarantor Phone Number
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="tel"
                    name="guarantor_phone_number"
                    value={formValues.guarantor_phone_number}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                    placeholder="Enter guarantor phone number"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Guarantor Information</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Providing guarantor information is optional but may help with loan approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documentTypes.map((docType) => (
                <div key={docType.type} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="text-center">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{docType.label}</h3>
                    <button
                      onClick={() => handleOpenModal(docType.type)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                      Upload Files
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {isLoadingFiles ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
                {uploadedFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No files uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {uploadedFiles.map((file: ApiFile) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {file.metadata?.documentType || 'Unknown type'}
                            </p>
                          </div>
                        </div>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">New Loan Application</h1>
            <p className="text-gray-600">Complete the form below to submit your loan application</p>
          </div>

          {/* Stepper */}
          <div className="mb-8">
            <nav aria-label="Progress">
              <ol className="flex items-center justify-between">
                {steps.map((step, stepIdx) => {
                  const isCompleted = stepIdx < activeStep;
                  const isCurrent = stepIdx === activeStep;
                  const IconComponent = step.icon;

                  return (
                    <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
                      {stepIdx !== steps.length - 1 && (
                        <div
                          className={`absolute top-4 left-8 w-full h-0.5 ${
                            isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex flex-col items-center group">
                        <span
                          className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                            isCompleted
                              ? 'bg-blue-600 border-blue-600'
                              : isCurrent
                              ? 'border-blue-600 bg-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckIcon className="h-4 w-4 text-white" />
                          ) : (
                            <IconComponent
                              className={`h-4 w-4 ${
                                isCurrent ? 'text-blue-600' : 'text-gray-400'
                              }`}
                            />
                          )}
                        </span>
                        <span
                          className={`mt-2 text-xs font-medium ${
                            isCurrent ? 'text-blue-600' : 'text-gray-500'
                          }`}
                        >
                          {step.title}
                        </span>
                        <span className="text-xs text-gray-400 text-center max-w-24">
                          {step.description}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            {renderStepContent(activeStep)}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={activeStep === 0}
              className={`inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl ${
                activeStep === 0
                  ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
              } transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800`}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Previous
            </button>

            <button
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              disabled={
                createApplicationMutation.isPending ||
                updateApplicationMutation.isPending ||
                !validateStep()
              }
              className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              {createApplicationMutation.isPending || updateApplicationMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : activeStep === steps.length - 1 ? (
                'Submit Application'
              ) : (
                <>
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* File Upload Modal */}
        {applicationId && (
          <FileUploadModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            applicationId={applicationId}
            documentType={selectedDocumentType}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
};

export default NewApplicationPage;