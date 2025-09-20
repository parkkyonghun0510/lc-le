#!/usr/bin/env node

/**
 * Frontend End-to-End Test Runner
 * 
 * Runs comprehensive frontend tests to validate user interface
 * functionality and integration with backend services.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class FrontendTestRunner {
  constructor() {
    this.results = {
      startTime: Date.now(),
      testSuites: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: []
      }
    };
  }

  async runAllTests(options = {}) {
    console.log('🚀 Starting Frontend End-to-End Test Suite');
    console.log('='.repeat(80));

    const testSuites = [
      {
        name: 'Unit Tests',
        command: 'npm',
        args: ['test', '--', '--watchAll=false', '--coverage=false', '--testPathPattern=(?!.*e2e).*\\.test\\.(ts|tsx|js|jsx)$'],
        description: 'Component and utility unit tests'
      },
      {
        name: 'Integration Tests',
        command: 'npm',
        args: ['test', '--', '--watchAll=false', '--testPathPattern=.*__tests__.*Integration.*\\.test\\.(ts|tsx)$'],
        description: 'Component integration tests'
      },
      {
        name: 'E2E Workflow Tests',
        command: 'npm',
        args: ['test', '--', '--watchAll=false', '--testPathPattern=.*e2e.*\\.test\\.(ts|tsx)$'],
        description: 'End-to-end user workflow tests'
      }
    ];

    // Add performance tests if requested
    if (options.includePerformance) {
      testSuites.push({
        name: 'Performance Tests',
        command: 'npm',
        args: ['test', '--', '--watchAll=false', '--testPathPattern=.*performance.*\\.test\\.(ts|tsx)$'],
        description: 'Frontend performance and load tests'
      });
    }

    let allPassed = true;

    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.name}`);
      console.log(`   ${suite.description}`);
      console.log('-'.repeat(60));

      const success = await this.runTestSuite(suite);
      if (!success) {
        allPassed = false;
        if (!options.continueOnFailure) {
          break;
        }
      }
    }

    // Generate report
    this.generateReport();

    return allPassed;
  }

  async runTestSuite(suite) {
    const startTime = Date.now();

    try {
      const result = await this.executeCommand(suite.command, suite.args, {
        timeout: 300000 // 5 minute timeout
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      const success = result.code === 0;

      const suiteResult = {
        success,
        duration,
        stdout: result.stdout,
        stderr: result.stderr,
        returnCode: result.code
      };

      this.results.testSuites[suite.name] = suiteResult;

      if (success) {
        console.log(`✅ ${suite.name} PASSED (${duration.toFixed(2)}s)`);
        this.extractTestCounts(result.stdout, true);
      } else {
        console.log(`❌ ${suite.name} FAILED (${duration.toFixed(2)}s)`);
        console.log(`   Return code: ${result.code}`);
        if (result.stderr) {
          console.log(`   Error: ${result.stderr.substring(0, 200)}...`);
        }
        this.extractTestCounts(result.stdout, false);
        this.results.summary.errors.push({
          suite: suite.name,
          error: result.stderr.substring(0, 500)
        });
      }

      return success;

    } catch (error) {
      console.log(`💥 ${suite.name} ERROR: ${error.message}`);
      
      const duration = (Date.now() - startTime) / 1000;
      
      this.results.testSuites[suite.name] = {
        success: false,
        duration,
        error: error.message
      };

      this.results.summary.errors.push({
        suite: suite.name,
        error: error.message
      });

      return false;
    }
  }

  executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Show real-time output for better feedback
        if (!options.quiet) {
          process.stdout.write(output);
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (!options.quiet) {
          process.stderr.write(output);
        }
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr
        });
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  extractTestCounts(output, passed) {
    // Extract Jest test results
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for Jest summary lines
      const testMatch = line.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (testMatch) {
        const [, failed, passedCount, total] = testMatch;
        this.results.summary.failed += parseInt(failed);
        this.results.summary.passed += parseInt(passedCount);
        this.results.summary.totalTests += parseInt(total);
        return;
      }

      // Alternative format
      const altMatch = line.match(/(\d+)\s+passing/);
      if (altMatch) {
        const [, passedCount] = altMatch;
        this.results.summary.passed += parseInt(passedCount);
        this.results.summary.totalTests += parseInt(passedCount);
      }

      const failMatch = line.match(/(\d+)\s+failing/);
      if (failMatch) {
        const [, failedCount] = failMatch;
        this.results.summary.failed += parseInt(failedCount);
        this.results.summary.totalTests += parseInt(failedCount);
      }
    }
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = (endTime - this.results.startTime) / 1000;

    console.log('\n' + '='.repeat(80));
    console.log('📊 FRONTEND TEST REPORT');
    console.log('='.repeat(80));

    // Summary
    const summary = this.results.summary;
    console.log(`Total Duration: ${totalDuration.toFixed(2)} seconds`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️  Skipped: ${summary.skipped}`);

    // Success rate
    if (summary.totalTests > 0) {
      const successRate = (summary.passed / summary.totalTests) * 100;
      console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    }

    // Suite breakdown
    console.log('\n📋 Test Suite Results:');
    for (const [suiteName, suiteResult] of Object.entries(this.results.testSuites)) {
      const status = suiteResult.success ? '✅ PASS' : '❌ FAIL';
      const duration = suiteResult.duration || 0;
      console.log(`  ${status} ${suiteName} (${duration.toFixed(2)}s)`);
    }

    // Errors
    if (summary.errors.length > 0) {
      console.log('\n🚨 Errors:');
      for (const error of summary.errors) {
        console.log(`  - ${error.suite}: ${error.error.substring(0, 100)}...`);
      }
    }

    // Save detailed report
    const reportFile = 'frontend-test-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);

    // Coverage information
    this.printCoverageInfo();
  }

  printCoverageInfo() {
    console.log('\n📈 Test Coverage:');
    
    // Check if coverage directory exists
    const coverageDir = path.join(process.cwd(), 'coverage');
    if (fs.existsSync(coverageDir)) {
      console.log('  ✅ Coverage reports generated in ./coverage/');
      console.log('  🌐 Open ./coverage/lcov-report/index.html to view detailed coverage');
    } else {
      console.log('  ℹ️  Run with --coverage to generate coverage reports');
    }
  }
}

// Test configuration validation
function validateTestEnvironment() {
  const requiredFiles = [
    'package.json',
    'jest.config.js',
    'jest.setup.js'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required test configuration files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }

  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    console.error('❌ node_modules not found. Run "npm install" first.');
    process.exit(1);
  }

  console.log('✅ Test environment validation passed');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    includePerformance: args.includes('--include-performance'),
    continueOnFailure: args.includes('--continue-on-failure'),
    quick: args.includes('--quick')
  };

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Frontend End-to-End Test Runner

Usage: node run_e2e_tests.js [options]

Options:
  --include-performance    Include performance tests
  --continue-on-failure    Continue running tests even if some fail
  --quick                  Run only quick tests (unit + integration)
  --help, -h              Show this help message

Examples:
  node run_e2e_tests.js                    # Run standard test suite
  node run_e2e_tests.js --quick            # Quick test run
  node run_e2e_tests.js --include-performance  # Include performance tests
`);
    process.exit(0);
  }

  console.log('🔍 Validating test environment...');
  validateTestEnvironment();

  const runner = new FrontendTestRunner();
  
  try {
    const success = await runner.runAllTests(options);
    
    if (success) {
      console.log('\n🎉 All frontend tests passed! UI is stable and ready.');
      process.exit(0);
    } else {
      console.log('\n💥 Some frontend tests failed. Please review the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Test runner encountered an error:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { FrontendTestRunner };