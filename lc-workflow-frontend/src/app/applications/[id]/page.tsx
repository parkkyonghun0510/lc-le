'use client';

import { useParams, useRouter } from 'next/navigation';
import { useApplication } from '@/hooks/useApplications';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { formatCurrency, sanitizeUUID } from '@/lib/utils';
import { format } from 'date-fns';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  
  // Sanitize and validate UUID from URL parameters
  const id = sanitizeUUID(rawId);
  const isValidId = id !== null;
  
  const { data: application, isLoading, error } = useApplication(id || '');

  if (!isValidId) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-red-800 mb-2">Invalid Application ID</h2>
                <p className="text-red-600 mb-4">
                  The provided ID "{rawId}" is not a valid UUID format.
                </p>
                <p className="text-sm text-red-500 mb-6">
                  Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                </p>
                <button
                  onClick={() => router.push('/applications')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Applications
                </button>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Application</h2>
            <p className="text-gray-600">{(error as any).message || 'An unexpected error occurred.'}</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!application) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Not Found</h2>
            <p className="text-gray-600">The application you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Application Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Application ID</h3>
                  <p className="mt-1 text-sm text-gray-900">{application.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      application.status === 'approved' 
                        ? 'bg-green-100 text-green-800'
                        : application.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {application.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Full Name (Latin)</h4>
                    <p className="mt-1 text-sm text-gray-900">{application.full_name_latin || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Full Name (Khmer)</h4>
                    <p className="mt-1 text-sm text-gray-900">{application.full_name_khmer || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Phone Number</h4>
                    <p className="mt-1 text-sm text-gray-900">{application.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Date of Birth</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {application.date_of_birth ? format(new Date(application.date_of_birth), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Requested Amount</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatCurrency(application.requested_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Product Type</h4>
                    <p className="mt-1 text-sm text-gray-900">{application.product_type || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Loan Term</h4>
                    <p className="mt-1 text-sm text-gray-900">{application.desired_loan_term || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Requested Disbursement Date</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {application.requested_disbursement_date 
                        ? format(new Date(application.requested_disbursement_date), 'MMM dd, yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Timeline */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application Timeline</h3>
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Created</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(application.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  {application.submitted_at && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Submitted</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {format(new Date(application.submitted_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                  {application.approved_at && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Approved</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {format(new Date(application.approved_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}