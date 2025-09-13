'use client';

import { 
  UserIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CurrencyProvider, useFormatCurrency } from '@/contexts/CurrencyContext';
import { WorkflowStatusTracker } from './WorkflowStatusTracker';
import { WorkflowActions } from './WorkflowActions';
import { WorkflowHistory } from './WorkflowHistory';
import { CustomerApplication } from '@/types/models';
import { useProductTypes } from '@/hooks/useEnums';

interface ApplicationRelationshipViewProps {
  application: CustomerApplication;
  officer?: any;
  manager?: any;
  department?: any;
  branch?: any;
  userRole?: string;
}

function ApplicationRelationshipContent({
  application,
  officer,
  manager,
  department,
  branch,
  userRole
}: ApplicationRelationshipViewProps) {
  const formatCurrencyWithConversion = useFormatCurrency();
  const productTypes = useProductTypes();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-50 border-green-200';
      case 'REJECTED': return 'text-red-600 bg-red-50 border-red-200';
      case 'USER_COMPLETED': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'TELLER_PROCESSING': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MANAGER_REVIEW': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'PO_CREATED': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        ទំនាក់ទំនងនិងព័ត៌មានលម្អិត
      </h2>

      {/* Organizational Hierarchy */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BuildingOfficeIcon className="w-5 h-5 mr-2 text-blue-600" />
          រចនាសម្ព័ន្ធអង្គការ
        </h3>
        
        <div className="flex items-center justify-center space-x-4 bg-gray-50 rounded-lg p-6">
          {/* Branch */}
          {branch && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">{branch.name}</h4>
              <p className="text-sm text-gray-600">សាខា</p>
              {branch.address && (
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center">
                  <MapPinIcon className="w-3 h-3 mr-1" />
                  {branch.address}
                </p>
              )}
            </div>
          )}

          {branch && department && (
            <ArrowRightIcon className="w-5 h-5 text-gray-400" />
          )}

          {/* Department */}
          {department && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <UserGroupIcon className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900">{department.name}</h4>
              <p className="text-sm text-gray-600">នាយកដ្ឋាន</p>
              <p className="text-xs text-gray-500 mt-1">{department.code}</p>
            </div>
          )}

          {department && manager && (
            <ArrowRightIcon className="w-5 h-5 text-gray-400" />
          )}

          {/* Manager */}
          {manager && (
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <UserIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900">
                {manager.first_name} {manager.last_name}
              </h4>
              <p className="text-sm text-gray-600">អ្នកគ្រប់គ្រង</p>
              {manager.phone_number && (
                <p className="text-xs text-gray-500 mt-1">{manager.phone_number}</p>
              )}
            </div>
          )}

          {manager && officer && (
            <ArrowRightIcon className="w-5 h-5 text-gray-400" />
          )}

          {/* Officer */}
          {officer && (
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <UserIcon className="w-8 h-8 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900">
                {officer.first_name} {officer.last_name}
              </h4>
              <p className="text-sm text-gray-600">មន្ត្រីកម្ចី</p>
              {officer.phone_number && (
                <p className="text-xs text-gray-500 mt-1">{officer.phone_number}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Application Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Customer Information */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
            ព័ត៌មានអតិថិជន
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">ឈ្មោះ:</span>
              <span className="text-sm font-medium text-gray-900">
                {application.full_name_khmer || application.full_name_latin || 'មិនបានបញ្ជាក់'}
              </span>
            </div>
            
            {application.id_number && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">អត្តសញ្ញាណប័ណ្ណ:</span>
                <span className="text-sm font-medium text-gray-900 font-mono">
                  {application.id_number}
                </span>
              </div>
            )}
            
            {application.phone && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ទូរស័ព្ទ:</span>
                <span className="text-sm font-medium text-gray-900">
                  {application.phone}
                </span>
              </div>
            )}
            
            {/* Occupation and monthly income fields removed as they're not in CustomerApplication interface */}
          </div>
        </div>

        {/* Loan Information */}
        <div className="bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-600" />
            ព័ត៌មានកម្ចី
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">ចំនួនទឹកប្រាក់:</span>
              <span className="text-lg font-bold text-green-600">
                {application.requested_amount 
                  ? formatCurrencyWithConversion(application.requested_amount, 'KHR')
                  : 'មិនបានបញ្ជាក់'
                }
              </span>
            </div>
            
            {application.product_type && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ប្រភេទផលិតផល:</span>
                <span className="text-sm font-medium text-gray-900">
                  {productTypes?.data?.find(type => type.value === application.product_type)?.label || application.product_type}
                </span>
              </div>
            )}
            
            {application.desired_loan_term && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ចំនួនបង់(ដង)</span>
                <span className="text-sm font-medium text-gray-900">
                  {application.desired_loan_term || 1}
                </span>
              </div>
            )}
            
            {/* Interest rate field removed as it's not in CustomerApplication interface */}
            
            {application.loan_purposes && application.loan_purposes.length > 0 && (
              <div>
                <span className="text-sm text-gray-600">គោលបំណង:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {application.loan_purposes.map((purpose: string, index: number) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {purpose}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Status Tracker */}
      <div className="mb-8">
        <WorkflowStatusTracker 
          currentStatus={application.workflow_status}
          userCompletedAt={application.user_completed_at}
          tellerProcessingAt={application.teller_processing_at}
          managerApprovedAt={application.approved_at}
          rejectedAt={application.rejected_at}
          rejectedBy={application.rejected_by}
          rejectionReason={application.rejection_reason}
          className="bg-white rounded-lg shadow-sm border"
        />
      </div>

      {/* Workflow Actions */}
      {userRole && (
        <div className="mb-8">
          <WorkflowActions 
            applicationId={application.id}
            currentStatus={application.workflow_status}
            userRole={userRole}
            className="bg-white rounded-lg shadow-sm border p-6"
          />
        </div>
      )}

      {/* Guarantor Information */}
      {(application.guarantor_name || application.guarantor_phone) && (
        <div className="bg-purple-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="w-5 h-5 mr-2 text-purple-600" />
            ព័ត៌មានអ្នកធានា
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {application.guarantor_name && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ឈ្មោះ:</span>
                <span className="text-sm font-medium text-gray-900">
                  {application.guarantor_name}
                </span>
              </div>
            )}
            
            {application.guarantor_phone && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ទូរស័ព្ទ:</span>
                <span className="text-sm font-medium text-gray-900">
                  {application.guarantor_phone}
                </span>
              </div>
            )}
            
            {/* Guarantor relationship and ID fields removed as they're not in CustomerApplication interface */}
          </div>
        </div>
      )}

      {/* Workflow History */}
      <div className="mb-8">
        <WorkflowHistory 
          applicationId={application.id}
          className="bg-white rounded-lg shadow-sm border"
        />
      </div>

      {/* Documents Summary */}
      {application.documents && application.documents.length > 0 && (
        <div className="mt-6 bg-orange-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2 text-orange-600" />
            ឯកសារភ្ជាប់ ({application.documents.length})
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {application.documents.map((doc: any, index: number) => (
              <div key={index} className="text-center p-3 bg-white rounded-lg border">
                <DocumentTextIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-xs font-medium text-gray-900 truncate">
                  {doc.name || `ឯកសារ ${index + 1}`}
                </p>
                <p className="text-xs text-gray-500">{doc.type || 'Unknown'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ApplicationRelationshipView(props: ApplicationRelationshipViewProps) {
  return (
    <CurrencyProvider>
      <ApplicationRelationshipContent {...props} />
    </CurrencyProvider>
  );
}