import React, { useState } from 'react';
import { diagnoseNetworkIssues, testApiConnection, checkLoginConnectivity, getLoginTroubleshootingInfo } from '@/lib/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export const NetworkDebugger: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; url: string; error?: string; responseTime?: number } | null>(null);
  const [loginCheckResult, setLoginCheckResult] = useState<{ canConnect: boolean; issues: string[]; suggestions: string[] } | null>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const diagnosis = await diagnoseNetworkIssues();
      setResults(diagnosis);
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setResults({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const testApi = async () => {
    setIsLoading(true);
    try {
      const result = await testApiConnection();
      setApiTestResult(result);
    } catch (error) {
      console.error('API test failed:', error);
      setApiTestResult({
        success: false,
        url: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkLogin = async () => {
    setIsLoading(true);
    try {
      const result = await checkLoginConnectivity();
      setLoginCheckResult(result);
    } catch (error) {
      console.error('Login check failed:', error);
      setLoginCheckResult({
        canConnect: false,
        issues: ['Login connectivity check failed'],
        suggestions: ['Check browser console for detailed errors']
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Network Debugger</h2>

      <div className="flex gap-4 mb-6 flex-wrap">
        <Button onClick={runDiagnostics} disabled={isLoading}>
          {isLoading ? 'Running Diagnostics...' : 'Run Network Diagnostics'}
        </Button>
        <Button onClick={testApi} disabled={isLoading} variant="outline">
          Test API Connection
        </Button>
        <Button onClick={checkLogin} disabled={isLoading} variant="outline">
          Check Login Connectivity
        </Button>
      </div>

      {apiTestResult !== null && (
        <div className="mb-6 p-4 rounded-lg bg-gray-100">
          <h3 className="font-semibold">API Connection Test:</h3>
          <div className="space-y-2">
            <p className={apiTestResult.success ? 'text-green-600' : 'text-red-600'}>
              {apiTestResult.success ? '✅ API Connection Successful' : '❌ API Connection Failed'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>URL:</strong> {apiTestResult.url}
            </p>
            {apiTestResult.responseTime && (
              <p className="text-sm text-gray-600">
                <strong>Response Time:</strong> {apiTestResult.responseTime}ms
              </p>
            )}
            {apiTestResult.error && (
              <p className="text-sm text-red-600">
                <strong>Error:</strong> {apiTestResult.error}
              </p>
            )}
          </div>
        </div>
      )}

      {loginCheckResult !== null && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50">
          <h3 className="font-semibold text-blue-800 mb-2">Login Connectivity Check:</h3>
          <div className="space-y-2">
            <p className={loginCheckResult.canConnect ? 'text-green-600' : 'text-red-600'}>
              {loginCheckResult.canConnect ? '✅ Login should work' : '❌ Login may have issues'}
            </p>

            {loginCheckResult.issues.length > 0 && (
              <div>
                <h4 className="font-medium text-red-800">Issues Found:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                  {loginCheckResult.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {loginCheckResult.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-800">Suggested Actions:</h4>
                <ul className="list-disc list-inside text-sm text-blue-700 mt-1">
                  {loginCheckResult.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Network Status</h3>
              <pre className="text-sm text-blue-700 whitespace-pre-wrap">
                {JSON.stringify(results.networkDiagnostics, null, 2)}
              </pre>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Browser Info</h3>
              <pre className="text-sm text-green-700 whitespace-pre-wrap">
                {JSON.stringify(results.browserInfo, null, 2)}
              </pre>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">API Connection</h3>
            <p className={results.apiConnection ? 'text-green-600' : 'text-red-600'}>
              {results.apiConnection ? '✅ Connected' : '❌ Not Connected'}
            </p>
          </div>

          {results.suggestions && results.suggestions.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Suggestions</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {results.suggestions.map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};