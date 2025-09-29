'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, testApiConnection } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';

export default function ApiTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const testConnection = async () => {
    setConnectionStatus('testing');
    setError('');
    setApiResponse(null);

    try {
      // First test with our simple function
      const isConnected = await testApiConnection();

      if (isConnected) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('failed');
        setError('API connection test returned false');
      }
    } catch (err: any) {
      setConnectionStatus('failed');
      setError(err.message || 'Unknown error occurred');
    }
  };

  const testThemeEndpoint = async () => {
    setConnectionStatus('testing');
    setError('');
    setApiResponse(null);

    try {
      const response = await apiClient.get('/settings/theme');
      setApiResponse(response);
      setConnectionStatus('success');
    } catch (err: any) {
      setConnectionStatus('failed');
      setError(err.message || 'Unknown error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Connection Test</h1>
          <p className="text-gray-600">
            Test direct API connectivity to the backend server.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Connection Test</h2>

            <div className="space-y-4">
              <NetworkStatusIndicator showDetails />

              <div className="flex space-x-4">
                <Button
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </Button>

                <Button
                  onClick={testThemeEndpoint}
                  disabled={connectionStatus === 'testing'}
                  variant="outline"
                >
                  Test Theme Endpoint
                </Button>
              </div>

              <div className="min-h-[100px]">
                {connectionStatus === 'success' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="font-medium text-green-800">✅ Connection Successful</h3>
                    {apiResponse && (
                      <details className="mt-2">
                        <summary className="text-sm text-green-700 cursor-pointer">View Response</summary>
                        <pre className="mt-2 text-xs bg-green-100 p-2 rounded overflow-auto">
                          {JSON.stringify(apiResponse, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {connectionStatus === 'failed' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <h3 className="font-medium text-red-800">❌ Connection Failed</h3>
                    {error && (
                      <p className="mt-2 text-sm text-red-700">{error}</p>
                    )}
                  </div>
                )}

                {connectionStatus === 'testing' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h3 className="font-medium text-blue-800">🔄 Testing Connection...</h3>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">API Configuration</h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">API Base URL:</span>
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api/v1'}
                </code>
              </div>

              <div>
                <span className="font-medium">Environment:</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded">
                  {process.env.NODE_ENV || 'development'}
                </span>
              </div>

              <div>
                <span className="font-medium">Protocol:</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded">
                  {typeof window !== 'undefined' ? window.location.protocol : 'unknown'}
                </span>
              </div>

              <div>
                <span className="font-medium">Host:</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded">
                  {typeof window !== 'undefined' ? window.location.host : 'unknown'}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-md">
              <h3 className="font-medium text-yellow-800 mb-2">Expected Behavior</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Backend server should be running on port 8090</li>
                <li>• API endpoint /settings/theme should return theme configuration</li>
                <li>• No CORS errors should appear in browser console</li>
                <li>• Network tab should show successful HTTP requests</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}