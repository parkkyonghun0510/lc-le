'use client';

import React, { useState, useEffect } from 'react';
import { performNetworkHealthCheck, testApiEndpoint, getNetworkDiagnostics, ConnectivityTestResult } from '@/lib/networkDiagnostics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { logger } from '@/lib/logger';

interface NetworkDiagnosticProps {
  onDiagnosisComplete?: (results: {
    healthCheck: any;
    apiTest: ConnectivityTestResult;
    diagnostics: any;
  }) => void;
}

export const NetworkDiagnostic: React.FC<NetworkDiagnosticProps> = ({ onDiagnosisComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    healthCheck?: any;
    apiTest?: ConnectivityTestResult;
    diagnostics?: any;
    error?: string;
  }>({});

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults({});

    try {
      logger.info('Starting network diagnostics from frontend', {
        category: 'frontend_network_diagnostic',
        timestamp: new Date().toISOString(),
      });

      // Get current network diagnostics
      const diagnostics = getNetworkDiagnostics();

      // Test general connectivity
      const healthCheck = await performNetworkHealthCheck();

      // Test specific API endpoint
      const apiTest = await testApiEndpoint();

      const diagnosticResults = {
        healthCheck,
        apiTest,
        diagnostics,
      };

      setResults(diagnosticResults);
      onDiagnosisComplete?.(diagnosticResults);

      logger.info('Network diagnostics completed', {
        category: 'frontend_network_diagnostic_complete',
        results: diagnosticResults,
      });

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setResults({ error: errorMessage });

      logger.error('Network diagnostics failed', error, {
        category: 'frontend_network_diagnostic_error',
        error: errorMessage,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Network Diagnostic Tool</h2>
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>
        </div>

        {results.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="font-medium text-red-800">Error</h3>
            <p className="text-red-700">{results.error}</p>
          </div>
        )}

        {results.diagnostics && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">Network Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Online:</span> {results.diagnostics.isOnline ? 'Yes' : 'No'}
                </div>
                {results.diagnostics.connectionType && (
                  <div>
                    <span className="font-medium">Connection Type:</span> {results.diagnostics.connectionType}
                  </div>
                )}
                {results.diagnostics.effectiveType && (
                  <div>
                    <span className="font-medium">Effective Type:</span> {results.diagnostics.effectiveType}
                  </div>
                )}
                {results.diagnostics.rtt && (
                  <div>
                    <span className="font-medium">RTT:</span> {results.diagnostics.rtt}ms
                  </div>
                )}
              </div>
            </div>

            {results.healthCheck && (
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium mb-2">Connectivity Tests</h3>
                <div className="space-y-2">
                  {results.healthCheck.connectivityResults.map((result: ConnectivityTestResult, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="font-mono text-sm truncate flex-1 mr-4">{result.url}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          result.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.success ? 'Success' : 'Failed'}
                        </span>
                        {result.responseTime && (
                          <span className="text-xs text-gray-600">{result.responseTime}ms</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-medium">Overall Health:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    results.healthCheck.overallHealth === 'good'
                      ? 'bg-green-100 text-green-800'
                      : results.healthCheck.overallHealth === 'poor'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {results.healthCheck.overallHealth}
                  </span>
                </div>
              </div>
            )}

            {results.apiTest && (
              <div className="p-4 bg-blue-50 rounded-md">
                <h3 className="font-medium mb-2">API Endpoint Test</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="font-mono text-sm truncate flex-1 mr-4">{results.apiTest.url}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        results.apiTest.success
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {results.apiTest.success ? 'Success' : 'Failed'}
                      </span>
                      {results.apiTest.responseTime && (
                        <span className="text-xs text-gray-600">{results.apiTest.responseTime}ms</span>
                      )}
                    </div>
                  </div>
                  {!results.apiTest.success && results.apiTest.error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <span className="font-medium text-red-800">Error:</span> {results.apiTest.error}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};