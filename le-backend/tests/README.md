# End-to-End Testing and Quality Assurance

This directory contains comprehensive end-to-end tests for the System Stability Improvements project. These tests validate complete user workflows, performance requirements, and system reliability.

## Test Structure

### 📁 Test Files

- **`test_end_to_end_workflows.py`** - Complete user workflow tests
- **`test_performance_stress.py`** - Performance and stress testing
- **`test_regression_critical_paths.py`** - Critical path regression tests
- **`test_folder_integration.py`** - Folder organization integration tests
- **`test_data_sync_integration.py`** - Data synchronization tests
- **`test_health_monitoring.py`** - System health monitoring tests

### 🏃‍♂️ Test Runners

- **`run_e2e_tests.py`** - Comprehensive backend test runner
- **`../lc-workflow-frontend/run_e2e_tests.js`** - Frontend test runner

## Test Categories

### 1. End-to-End Workflow Tests

**File:** `test_end_to_end_workflows.py`

Tests complete user workflows from start to finish:

- **Complete Loan Application Document Workflow**
  - Create application → Upload documents → Organize folders
  - Validates automatic folder organization
  - Verifies file-folder associations
  - Tests audit logging

- **File Upload with Folder Conflicts Resolution**
  - Tests handling of duplicate parent folders
  - Validates folder consolidation logic
  - Ensures data integrity during conflicts

- **Concurrent File Uploads**
  - Tests system behavior under concurrent load
  - Validates no race conditions occur
  - Ensures database consistency

- **System Health and Monitoring Workflow**
  - Tests health check endpoints
  - Validates metrics collection
  - Tests alerting system functionality

### 2. Performance and Stress Tests

**File:** `test_performance_stress.py`

Tests system performance under various load conditions:

- **Concurrent File Upload Performance**
  - Tests 20+ concurrent uploads
  - Measures throughput and success rates
  - Validates performance requirements (>90% success rate)

- **Large File Upload Performance**
  - Tests files up to 10MB
  - Measures upload times and throughput
  - Ensures no timeouts or memory issues

- **Folder Organization Under Load**
  - Tests concurrent folder creation
  - Validates folder reuse logic
  - Ensures no duplicate folders created

- **System Resource Usage**
  - Monitors memory usage during bulk operations
  - Tests database connection efficiency
  - Validates resource cleanup

### 3. Regression Tests

**File:** `test_regression_critical_paths.py`

Tests critical user paths to prevent regressions:

- **Basic File Upload Regression**
  - Most fundamental operation must always work
  - Tests required response fields
  - Validates database consistency

- **Folder Organization Regression**
  - Tests automatic folder creation
  - Validates document type mapping
  - Ensures no duplicate parent folders

- **Parameter Processing Regression**
  - Tests various parameter combinations
  - Validates folder_id preservation
  - Tests field_name handling

- **Error Handling Regression**
  - Tests standardized error responses
  - Validates helpful error messages
  - Ensures no 500 Internal Server Errors

- **File Download Regression**
  - Tests file retrieval functionality
  - Validates content integrity
  - Tests appropriate headers

- **Concurrent Access Regression**
  - Tests system under concurrent load
  - Validates no data corruption
  - Ensures database consistency

## Running Tests

### Quick Test Run

```bash
# Backend tests (unit + integration only)
python run_e2e_tests.py --quick

# Frontend tests (unit + integration only)
cd ../lc-workflow-frontend
node run_e2e_tests.js --quick
```

### Full Test Suite

```bash
# Backend tests (includes performance tests)
python run_e2e_tests.py --include-slow

# Frontend tests (includes performance tests)
cd ../lc-workflow-frontend
node run_e2e_tests.js --include-performance
```

### Stress Testing

```bash
# Backend stress tests (requires --include-slow)
python run_e2e_tests.py --include-slow --include-stress

# Individual test files
python -m pytest test_performance_stress.py -v -m slow
python -m pytest test_regression_critical_paths.py -v
```

### Individual Test Categories

```bash
# End-to-end workflows
python -m pytest test_end_to_end_workflows.py -v

# Performance tests
python -m pytest test_performance_stress.py -v -m slow

# Regression tests
python -m pytest test_regression_critical_paths.py -v

# Integration tests
python -m pytest test_folder_integration.py test_data_sync_integration.py -v
```

## Test Requirements Validation

### Requirements Coverage

The tests validate all requirements from the System Stability Improvements spec:

#### ✅ Requirement 1: Backend Error Resolution
- Tests file upload success (200 OK instead of 503)
- Validates folder consolidation
- Tests graceful error handling

#### ✅ Requirement 2: File Upload Parameter Processing
- Tests folder_id parameter preservation
- Validates form data processing
- Tests parameter validation

#### ✅ Requirement 3: Folder Organization System
- Tests automatic folder creation
- Validates document type mapping
- Tests folder reuse logic

#### ✅ Requirement 4: Database Integrity and Cleanup
- Tests duplicate folder consolidation
- Validates referential integrity
- Tests cleanup operations

#### ✅ Requirement 5: File Management CRUD Operations
- Tests file upload, download, delete
- Validates file type checking
- Tests secure operations

#### ✅ Requirement 6: Error Handling and User Feedback
- Tests progress indicators
- Validates error messages
- Tests retry mechanisms

#### ✅ Requirement 7: Performance and Reliability
- Tests concurrent operations
- Validates response times
- Tests automatic retry

#### ✅ Requirement 8: Data Consistency and Synchronization
- Tests cache invalidation
- Validates real-time updates
- Tests manual refresh

#### ✅ Requirement 9: Mobile and Cross-Platform Compatibility
- Tests mobile file upload
- Validates responsive interface
- Tests camera integration

#### ✅ Requirement 10: Security and Access Control
- Tests authentication
- Validates file access control
- Tests secure downloads

## Performance Benchmarks

### Expected Performance Metrics

- **File Upload Success Rate:** ≥90%
- **Concurrent Upload Throughput:** ≥0.5 uploads/sec
- **Large File Upload Time:** <120s for 10MB files
- **Folder Consolidation Time:** <30s for 10 duplicates
- **Memory Usage Increase:** <200MB during bulk operations
- **Database Operations:** ≥5 ops/sec

### Performance Test Results

Test results are saved to `test_report.json` and include:

- Success rates for all test categories
- Performance metrics and benchmarks
- Resource usage statistics
- Error analysis and recommendations

## Test Environment Setup

### Prerequisites

```bash
# Backend dependencies
pip install pytest pytest-asyncio httpx sqlalchemy aiosqlite

# Frontend dependencies (in lc-workflow-frontend/)
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### Database Setup

Tests use SQLite for isolation:

```python
# Test database is automatically created and cleaned up
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
```

### Mock Services

Tests include mocks for:

- MinIO storage service
- Authentication service
- External API calls
- Device detection
- Camera capture

## Continuous Integration

### GitHub Actions Integration

```yaml
# .github/workflows/e2e-tests.yml
name: End-to-End Tests
on: [push, pull_request]
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run E2E tests
        run: python run_e2e_tests.py --quick
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
        working-directory: ./lc-workflow-frontend
      - name: Run E2E tests
        run: node run_e2e_tests.js --quick
        working-directory: ./lc-workflow-frontend
```

## Troubleshooting

### Common Issues

1. **Test Database Locked**
   ```bash
   # Remove test database file
   rm test.db
   ```

2. **Port Already in Use**
   ```bash
   # Kill processes using test ports
   lsof -ti:8000 | xargs kill -9
   ```

3. **Memory Issues During Stress Tests**
   ```bash
   # Run with limited concurrency
   python -m pytest test_performance_stress.py -v --maxfail=1
   ```

4. **Frontend Test Timeouts**
   ```bash
   # Increase Jest timeout
   npm test -- --testTimeout=30000
   ```

### Debug Mode

```bash
# Run with verbose output and stop on first failure
python -m pytest test_end_to_end_workflows.py -v -x --tb=long

# Run specific test with debug output
python -m pytest test_end_to_end_workflows.py::TestCompleteFileUploadWorkflow::test_complete_loan_application_document_workflow -v -s
```

## Contributing

### Adding New Tests

1. **End-to-End Tests:** Add to `test_end_to_end_workflows.py`
2. **Performance Tests:** Add to `test_performance_stress.py`
3. **Regression Tests:** Add to `test_regression_critical_paths.py`

### Test Naming Convention

```python
# Format: test_{category}_{specific_scenario}
def test_file_upload_with_folder_conflicts_resolution(self):
    """Test description explaining what is being validated"""
    pass
```

### Test Documentation

Each test should include:

- Clear docstring explaining the test purpose
- Comments explaining critical assertions
- Performance expectations where applicable
- Requirements traceability

## Quality Gates

### Test Coverage Requirements

- **Unit Tests:** ≥80% code coverage
- **Integration Tests:** All major workflows covered
- **E2E Tests:** All user-facing features tested
- **Performance Tests:** All performance requirements validated

### Success Criteria

Tests must validate:

- ✅ File uploads return 200 OK (not 503)
- ✅ Files correctly associated with folders
- ✅ No duplicate parent folders in database
- ✅ Automatic folder organization works
- ✅ Error messages are clear and actionable
- ✅ System handles concurrent operations
- ✅ Performance meets benchmarks
- ✅ Mobile compatibility verified
- ✅ Security measures implemented
- ✅ System health monitoring operational

The test suite ensures the System Stability Improvements meet all requirements and provide a reliable, performant user experience.