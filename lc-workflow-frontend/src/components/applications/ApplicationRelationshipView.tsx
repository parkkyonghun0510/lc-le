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

interface ApplicationRelationshipViewProps {
  application: any;
  officer?: any;
  manager?: any;
  department?: any;
  branch?: any;
}

function ApplicationRelationshipContent({
  application,
  officer,
  manager,
  department,
  branch
}: ApplicationRelationshipViewProps) {
  const formatCurrencyWithConversion = useFormatCurrency();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'submitted': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'under_review': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200';
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
            
            {application.occupation && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">មុខរបរ:</span>
                <span className="text-sm font-medium text-gray-900">
                  {application.occupation}
                </span>
              </div>
            )}
            
            {application.monthly_income && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ប្រាក់ចំណូលខែ:</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrencyWithConversion(application.monthly_income, 'KHR')}
                </span>
              </div>
            )}
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
                  {application.product_type}
                </span>
              </div>
            )}
            
            {application.desired_loan_term && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">រយៈពេល:</span>
                <span className="text-sm font-medium text-gray-900">
                  {application.desired_loan_term}
                </span>
              </div>
            )}
            
            {application.interest_rate && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">អត្រាការប្រាក់:</span>
                <span className="text-sm font-medium text-blue-600">
                  {application.interest_rate}% ក្នុងមួយឆ្នាំ
                </span>
              </div>
            )}
            
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

      {/* Status and Risk Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Status */}
        <div className="text-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full border ${getStatusColor(application.status)}`}>
            <ClockIcon className="w-4 h-4 mr-2" />
            {application.status?.toUpperCase()}
          </div>
          <p className="text-sm text-gray-600 mt-2">ស្ថានភាពបច្ចុប្បន្ន</p>
        </div>

        {/* Risk Assessment */}
        {application.risk_category && (
          <div className="text-center">
            <div className={`inline-flex items-center px-4 py-2 rounded-full ${getRiskColor(application.risk_category)}`}>
              <ShieldCheckIcon className="w-4 h-4 mr-2" />
              {application.risk_category?.toUpperCase()} RISK
            </div>
            <p className="text-sm text-gray-600 mt-2">កម្រិតហានិភ័យ</p>
          </div>
        )}

        {/* Credit Score */}
        {application.credit_score && (
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {application.credit_score}
            </div>
            <p className="text-sm text-gray-600">ពិន្ទុឥណទាន</p>
          </div>
        )}
      </div>

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
            
            {application.guarantor_relationship && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ទំនាក់ទំនង:</span>
                <span className="text-sm font-medium text-gray-900">
                  {application.guarantor_relationship}
                </span>
              </div>
            )}
            
            {application.guarantor_id_number && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">អត្តសញ្ញាណប័ណ្ណ:</span>
                <span className="text-sm font-medium text-gray-900 font-mono">
                  {application.guarantor_id_number}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ClockIcon className="w-5 h-5 mr-2 text-gray-600" />
          ប្រវត្តិការណ៍
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full mt-1"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">បង្កើតពាក្យសុំ</p>
              <p className="text-xs text-gray-500">{formatDate(application.created_at)}</p>
            </div>
          </div>

          {application.submitted_at && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-3 h-3 bg-yellow-600 rounded-full mt-1"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">ដាក់ស្នើ</p>
                <p className="text-xs text-gray-500">{formatDate(application.submitted_at)}</p>
              </div>
            </div>
          )}

          {application.approved_at && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-3 h-3 bg-green-600 rounded-full mt-1"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">អនុម័ត</p>
                <p className="text-xs text-gray-500">{formatDate(application.approved_at)}</p>
              </div>
            </div>
          )}

          {application.rejected_at && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-3 h-3 bg-red-600 rounded-full mt-1"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">បដិសេធ</p>
                <p className="text-xs text-gray-500">{formatDate(application.rejected_at)}</p>
                {application.rejection_reason && (
                  <p className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                    មូលហេតុ: {application.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
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