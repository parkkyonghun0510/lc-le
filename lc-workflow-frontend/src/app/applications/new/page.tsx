'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  useCreateApplication,
  useUpdateApplication,
  useSubmitApplication,
} from '@/hooks/useApplications';
import { useApplicationFiles, useUploadFile, useDeleteFile } from '@/hooks/useFiles';
import { useAuth } from '@/hooks/useAuth';
import FileUploadModal from '@/components/files/FileUploadModal';
import GroupFileUploadModal from '@/components/files/GroupFileUploadModal';
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
    title: 'ក.ព័ត៌មានរបស់អតិថិជន ',
    // description: 'Basic customer details',
    icon: UserIcon,
  },
  {
    id: 1,
    title: 'ខ.ព័ត៌មានបញ្ចាំ',
    // description: 'Loan amount and terms',
    icon: CurrencyDollarIcon,
  },
  {
    id: 2,
    title: 'គ.ការធានារបស់អតិថិជន',
    // description: 'Guarantor details',
    icon: UserGroupIcon,
  },
  {
    id: 3,
    title: 'ឃ.ទ្រព្យសម្បត្តិដែលមានស្រាប់របស់អតិថិជន ',
    // description: 'Upload required documents',
    icon: DocumentTextIcon,
  },
];

const NewApplicationPage = () => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0); // Start at customer information step
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | undefined>();
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

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
    sex: '',
    marital_status: '',

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
    desired_loan_term: 1,
    product_type: PRODUCT_TYPES[0],
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
  const submitApplicationMutation = useSubmitApplication();
  const uploadFileMutation = useUploadFile();
  const deleteFileMutation = useDeleteFile();
  const router = useRouter();

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
        name === 'desired_loan_term' ? Math.max(1, Number(value) || 1) :
          value
    }));
  };

  const isStepValid = useMemo(() => {
    // Temporarily disable validation for testing
    return true;
  }, [activeStep, formValues]);

  const createDraftApplication = async () => {
    try {
      // Validate user permissions for creating applications
      if (!user) {
        toast.error('User authentication required to create applications.');
        return null;
      }

      const data = await createApplicationMutation.mutateAsync({
        full_name_latin: formValues.full_name_latin,
        full_name_khmer: formValues.full_name_khmer,
        id_card_type: formValues.id_card_type,
        id_number: formValues.id_number,
        phone: formValues.phone,
        date_of_birth: formValues.date_of_birth,
        current_address: formValues.current_address,
        portfolio_officer_name: formValues.portfolio_officer_name,
        requested_amount: parseFloat(formValues.requested_amount),
        desired_loan_term: Number(formValues.desired_loan_term),
        product_type: formValues.product_type,
        requested_disbursement_date: formValues.requested_disbursement_date,
        loan_purposes: formValues.loan_purposes,
        purpose_details: formValues.purpose_details,
        guarantor_name: formValues.guarantor_name,
        guarantor_phone: formValues.guarantor_phone,
        guarantor_address: formValues.guarantor_address,
        guarantor_relationship: formValues.guarantor_relationship,
        guarantor_id_number: formValues.guarantor_id_number,
        // sex: formValues.sex,
        // marital_status: formValues.marital_status,
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
            desired_loan_term: Number(formValues.desired_loan_term),
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
    if (!applicationId) {
      toast.error('No application to submit');
      return;
    }

    // Validate the entire form before submission
    const validation = validateStep(activeStep, formValues);
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    try {
      // First, ensure all form data is saved
      await updateApplicationMutation.mutateAsync({
        id: applicationId,
        data: {
          // Customer Information
          full_name_latin: formValues.full_name_latin,
          full_name_khmer: formValues.full_name_khmer,
          id_card_type: formValues.id_card_type,
          id_number: formValues.id_number,
          phone: formValues.phone,
          current_address: formValues.current_address,
          date_of_birth: formValues.date_of_birth,
          portfolio_officer_name: formValues.portfolio_officer_name,
          // marital_status: formValues.marital_status,
          // sex: formValues.sex,

          // Loan Information
          requested_amount: parseFloat(formValues.requested_amount),
          desired_loan_term: Number(formValues.desired_loan_term),
          product_type: formValues.product_type,
          requested_disbursement_date: formValues.requested_disbursement_date,
          loan_purposes: formValues.loan_purposes,
          purpose_details: formValues.purpose_details,

          // Guarantor Information
          guarantor_name: formValues.guarantor_name,
          guarantor_phone: formValues.guarantor_phone,
          guarantor_address: formValues.guarantor_address,
          guarantor_id_number: formValues.guarantor_id_number,
          guarantor_relationship: formValues.guarantor_relationship
        },
      });

      // Then submit the application
      await submitApplicationMutation.mutateAsync(applicationId);

      toast.success('Application submitted successfully!');
      // Redirect to applications listing page after successful submission
      router.push('/applications');
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

  const handleOpenGroupModal = () => {
    setIsGroupModalOpen(true);
  };

  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!applicationId) return;

    setIsDeleting(prev => ({ ...prev, [fileId]: true }));

    try {
      await deleteFileMutation.mutateAsync(fileId);
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    } finally {
      setIsDeleting(prev => ({ ...prev, [fileId]: false }));
    }
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
            loanPurposes={LOAN_PURPOSES.map(purpose => ({
              value: purpose,
              label: purpose,
            }))} isLoadingProductTypes={false}
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
            applicationId={applicationId || undefined}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {/* Enhanced Header with Visual Elements */}
            <div className="mb-8 sm:mb-10 lg:mb-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 leading-tight px-4">
                ពាក្យស្នើសុំដាក់បញ្ចាំ និងប្រាកិភោគដោយអនុប្បទាន
              </h1>
            </div>

            {/* Enhanced Step Indicator Container */}
            <div className="mb-6 sm:mb-8 lg:mb-10">
              <StepIndicator steps={steps} activeStep={activeStep} />
            </div>

            {/* Enhanced Form Content Container */}
            <div className="relative">
              {/* Background decoration - hidden on mobile for better performance */}
              <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-2xl sm:rounded-3xl transform rotate-1"></div>
              <div className="hidden sm:block absolute inset-0 bg-gradient-to-l from-purple-600/5 to-pink-600/5 rounded-2xl sm:rounded-3xl transform -rotate-1"></div>

              {/* Main form container */}
              <div className="relative bg-white dark:bg-gray-800 sm:bg-white/80 sm:dark:bg-gray-800/80 sm:backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-2xl border border-gray-200 dark:border-gray-700 sm:border-white/20 sm:dark:border-gray-700/50 p-4 sm:p-6 lg:p-8 xl:p-12 mb-6 sm:mb-8 lg:mb-10">
                {/* Step content with enhanced spacing */}
                <div className="relative z-10">
                  {renderStepContent(activeStep)}
                </div>

                {/* Subtle inner glow effect - hidden on mobile */}
                <div className="hidden sm:block absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              </div>
            </div>

            {/* Enhanced Navigation Container */}
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 sm:bg-white/60 sm:dark:bg-gray-800/60 sm:backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border border-gray-200 dark:border-gray-700 sm:border-white/30 sm:dark:border-gray-700/30 p-4 sm:p-6">
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

            {/* Floating progress indicator - hidden on mobile, shown as fixed on larger screens */}
            <div className="hidden sm:block fixed bottom-6 right-6 z-50">
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

        {/* Group File Upload Modal */}
        {applicationId && (
          <GroupFileUploadModal
            isOpen={isGroupModalOpen}
            onClose={handleCloseGroupModal}
            applicationId={applicationId}
            documentTypes={DOCUMENT_TYPES}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
};

export default NewApplicationPage;