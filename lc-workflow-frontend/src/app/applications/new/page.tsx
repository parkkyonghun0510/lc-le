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
import { File as ApiFile } from '@/types/models';
import {
  UserIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Import types and constants
import {
  ApplicationFormValues,
  DocumentType,
  Step,
  IDCardType,
  LOAN_PURPOSES,
  PRODUCT_TYPES,
  ID_CARD_TYPES,
  DOCUMENT_TYPES,
} from './types';

// Import components
import { CustomerInformationStep } from './components/CustomerInformationStep';
import { LoanInformationStep } from './components/LoanInformationStep';
import { GuarantorInformationStep } from './components/GuarantorInformationStep';
import { DocumentAttachmentStep } from './components/DocumentAttachmentStep';
import { StepIndicator } from './components/StepIndicator';
import { StepNavigation } from './components/StepNavigation';

// Import validation utilities
import { validateStep } from './utils/validation';

const steps: Step[] = [
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

  const [formValues, setFormValues] = useState<ApplicationFormValues>({
    // Customer Information
    full_name_latin: '',
    full_name_khmer: '',
    id_card_type: '' as IDCardType,
    id_number: '',
    phone: '',
    current_address: '',
    date_of_birth: '',
    portfolio_officer_name: '',
    
    // Address Information (optional)
    province: '',
    district: '',
    commune: '',
    village: '',
    
    // Employment Information (optional)
    occupation: '',
    employer_name: '',
    monthly_income: 0,
    income_source: '',
    
    // Loan Information
    requested_amount: '',
    desired_loan_term: 0,
    product_type: '',
    requested_disbursement_date: '',
    loan_purposes: [LOAN_PURPOSES[0]],
    purpose_details: '',
    interest_rate: 0,
    
    // Guarantor Information
    guarantor_name: '',
    guarantor_phone: '',
    guarantor_id_number: '',
    guarantor_address: '',
    guarantor_relationship: '',
    
    // Financial Information (optional)
    monthly_expenses: 0,
    assets_value: 0,
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
    setFormValues(prev => ({
      ...prev,
      [name]: name === 'loan_purposes' ? [value] : 
              name === 'desired_loan_term' ? Number(value) || 0 : 
              value
    }));
  };

  const isStepValid = useMemo(() => {
    const validation = validateStep(activeStep, formValues);
    return validation.isValid;
  }, [activeStep, formValues]);

  const createDraftApplication = async () => {
    try {
      const data = await createApplicationMutation.mutateAsync({
        account_id: '1', // Default account ID - should be set based on logged in user
        full_name_latin: formValues.full_name_latin,
        full_name_khmer: formValues.full_name_khmer,
        id_card_type: formValues.id_card_type,
        id_number: formValues.id_number,
        phone: formValues.phone,
        date_of_birth: formValues.date_of_birth,
        portfolio_officer_name: formValues.portfolio_officer_name,
        requested_amount: parseFloat(formValues.requested_amount),
        desired_loan_term: Number(formValues.desired_loan_term),
        product_type: formValues.product_type,
        requested_disbursement_date: formValues.requested_disbursement_date,
        loan_purposes: formValues.loan_purposes,
        purpose_details: formValues.purpose_details,
        guarantor_name: formValues.guarantor_name,
        guarantor_phone: formValues.guarantor_phone,
      });
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
    const validation = validateStep(activeStep, formValues);
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
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
            desired_loan_term: formValues.desired_loan_term,
            product_type: formValues.product_type,
            requested_disbursement_date: formValues.requested_disbursement_date,
            loan_purposes: formValues.loan_purposes,
            purpose_details: formValues.purpose_details,
          },
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
            guarantor_phone: formValues.guarantor_phone,
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
        data: {},
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
          <CustomerInformationStep
            formValues={formValues}
            onInputChange={handleInputChange}
          />
        );
      case 1:
        return (
          <LoanInformationStep
              formValues={formValues}
              onInputChange={handleInputChange}
              loanPurposes={LOAN_PURPOSES}
            />
        );
      case 2:
        return (
          <GuarantorInformationStep
            formValues={formValues}
            onInputChange={handleInputChange}
          />
        );
      case 3:
        return (
          <DocumentAttachmentStep
            documentTypes={DOCUMENT_TYPES}
            uploadedFiles={uploadedFiles}
            isLoadingFiles={isLoadingFiles}
            onOpenModal={handleOpenModal}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Enhanced Header with Visual Elements */}
            <div className="mb-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
                New Loan Application
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Complete the form below to submit your loan application. Our streamlined process ensures quick and secure processing.
              </p>
            </div>

            {/* Enhanced Step Indicator Container */}
            <div className="mb-10">
              <StepIndicator steps={steps} activeStep={activeStep} />
            </div>

            {/* Enhanced Form Content Container */}
            <div className="relative">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-3xl transform rotate-1"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-purple-600/5 to-pink-600/5 rounded-3xl transform -rotate-1"></div>
              
              {/* Main form container */}
              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 lg:p-12 mb-10">
                {/* Step content with enhanced spacing */}
                <div className="relative z-10">
                  {renderStepContent(activeStep)}
                </div>
                
                {/* Subtle inner glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              </div>
            </div>

            {/* Enhanced Navigation Container */}
            <div className="relative">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/30 p-6">
                <StepNavigation
                  activeStep={activeStep}
                  steps={steps}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onSubmit={handleSubmit}
                  isNextDisabled={!isStepValid}
                  isLoading={createApplicationMutation.isPending || updateApplicationMutation.isPending}
                />
              </div>
            </div>

            {/* Floating progress indicator */}
            <div className="fixed bottom-6 right-6 z-50">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full shadow-2xl border border-white/30 dark:border-gray-700/30 p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {activeStep + 1} of {steps.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced File Upload Modal */}
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