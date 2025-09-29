'use client';

import React from 'react';
import { NetworkDiagnostic } from '@/components/NetworkDiagnostic';
import { logger } from '@/lib/logger';

export default function NetworkDiagnosticPage() {
  const handleDiagnosisComplete = (results: any) => {
    logger.info('Network diagnostic results from frontend', {
      category: 'frontend_diagnostic_results',
      results,
    });

    // Log specific issues for debugging
    if (!results.apiTest?.success) {
      logger.error('API endpoint test failed from frontend', new Error(results.apiTest?.error), {
        category: 'frontend_api_test_failed',
        apiTest: results.apiTest,
        diagnostics: results.diagnostics,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Network Diagnostic</h1>
          <p className="text-gray-600">
            This tool helps diagnose network connectivity issues between the frontend and backend.
          </p>
        </div>

        <NetworkDiagnostic onDiagnosisComplete={handleDiagnosisComplete} />

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Expected Results</h2>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>Network Status:</strong> Should show "Online: Yes" if your internet connection is working.</p>
            <p><strong>Connectivity Tests:</strong> Most external URLs should succeed (Google, HTTP status services).</p>
            <p><strong>API Endpoint Test:</strong> The <code className="bg-blue-100 px-1 rounded">/api/v1/settings/theme</code> endpoint should succeed if the backend is properly connected.</p>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-md">
            <h3 className="font-medium text-yellow-800 mb-2">Common Issues</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Backend server not running on port 8090</li>
              <li>• CORS configuration issues</li>
              <li>• HTTPS/HTTP mixed content issues</li>
              <li>• Firewall blocking connections</li>
              <li>• Network timeout settings too aggressive</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}