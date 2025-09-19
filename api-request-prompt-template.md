# API Implementation Request Template

## Overview
Please implement the following API endpoint with the specified requirements and technical details.

---

## 1. API Endpoint Specification

### Base URL
```
[ENVIRONMENT_URL]/api/v1
```

### Endpoint Details
- **Method**: `[GET|POST|PUT|PATCH|DELETE]`
- **Path**: `/[resource]/[sub-resource]`
- **Full URL**: `[BASE_URL]/[resource]/[sub-resource]`
- **Purpose**: [Brief description of what this endpoint does]

---

## 2. Authentication Requirements

### Authentication Method
- **Type**: `[Bearer Token|API Key|Basic Auth|OAuth 2.0|None]`
- **Header**: `Authorization: Bearer {token}` or `X-API-Key: {key}`
- **Scope/Permissions**: `[read:resource, write:resource, admin:resource]`
- **Token Expiration**: `[duration]`

### Example Authentication Header
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Request Parameters

### Path Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string/uuid | Yes | Resource identifier | `123e4567-e89b-12d3-a456-426614174000` |
| `[param]` | `[type]` | `[Yes/No]` | `[description]` | `[example]` |

### Query Parameters
| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `page` | integer | No | 1 | min: 1, max: 1000 | Page number for pagination |
| `limit` | integer | No | 20 | min: 1, max: 100 | Items per page |
| `sort` | string | No | created_at | enum: [created_at, updated_at, name] | Sort field |
| `order` | string | No | desc | enum: [asc, desc] | Sort order |
| `filter` | string | No | null | max_length: 255 | Search filter |
| `[param]` | `[type]` | `[Yes/No]` | `[default]` | `[validation]` | `[description]` |

### Request Headers
| Header | Required | Description | Example |
|--------|----------|-------------|---------|
| `Content-Type` | Yes | Request content type | `application/json` |
| `Accept` | Yes | Expected response format | `application/json` |
| `X-Request-ID` | No | Request tracking ID | `req_123456789` |
| `User-Agent` | No | Client identification | `MyApp/1.0.0` |

### Request Body (for POST/PUT/PATCH)
```json
{
  "required_field": "string",
  "optional_field": "string",
  "nested_object": {
    "property": "value"
  },
  "array_field": ["item1", "item2"],
  "numeric_field": 123.45,
  "boolean_field": true,
  "date_field": "2025-01-18T10:30:00Z"
}
```

---

## 4. Response Specification

### Success Response Format
**Status Code**: `200 OK` (or `201 Created`, `204 No Content`)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field1": "value1",
    "field2": "value2",
    "nested_data": {
      "property": "value"
    },
    "created_at": "2025-01-18T10:30:00Z",
    "updated_at": "2025-01-18T10:30:00Z"
  },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  },
  "links": {
    "self": "/api/v1/resource?page=1",
    "next": "/api/v1/resource?page=2",
    "prev": null,
    "first": "/api/v1/resource?page=1",
    "last": "/api/v1/resource?page=5"
  }
}
```

### Response Data Types
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | uuid | No | Unique identifier |
| `field1` | string | No | Description of field1 |
| `field2` | integer | Yes | Description of field2 |
| `created_at` | datetime | No | ISO 8601 timestamp |
| `updated_at` | datetime | No | ISO 8601 timestamp |

---

## 5. Error Handling Requirements

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional technical details",
    "field_errors": {
      "field_name": ["Field specific error message"]
    }
  },
  "request_id": "req_123456789",
  "timestamp": "2025-01-18T10:30:00Z"
}
```

### HTTP Status Codes
| Status | Code | Description | When to Use |
|--------|------|-------------|-------------|
| Success | 200 | OK | Successful GET, PUT, PATCH |
| Created | 201 | Created | Successful POST |
| No Content | 204 | No Content | Successful DELETE |
| Bad Request | 400 | Bad Request | Invalid request data |
| Unauthorized | 401 | Unauthorized | Missing/invalid authentication |
| Forbidden | 403 | Forbidden | Insufficient permissions |
| Not Found | 404 | Not Found | Resource doesn't exist |
| Conflict | 409 | Conflict | Resource already exists |
| Validation Error | 422 | Unprocessable Entity | Request validation failed |
| Rate Limited | 429 | Too Many Requests | Rate limit exceeded |
| Server Error | 500 | Internal Server Error | Unexpected server error |

### Error Codes
| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request format is invalid |
| `MISSING_REQUIRED_FIELD` | 422 | Required field is missing |
| `INVALID_FIELD_FORMAT` | 422 | Field format is invalid |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## 6. Data Validation Rules

### Input Validation
| Field | Rules | Error Message |
|-------|-------|---------------|
| `email` | Valid email format, max 255 chars | "Invalid email format" |
| `phone` | Valid phone format, 10-15 digits | "Invalid phone number" |
| `password` | Min 8 chars, 1 upper, 1 lower, 1 digit | "Password too weak" |
| `amount` | Positive number, max 2 decimal places | "Invalid amount format" |
| `date` | ISO 8601 format, not in past | "Invalid date format" |

### Business Logic Validation
- **Rule 1**: [Description of business rule and validation]
- **Rule 2**: [Description of business rule and validation]
- **Rule 3**: [Description of business rule and validation]

### Data Sanitization
- Strip whitespace from string fields
- Convert email to lowercase
- Normalize phone numbers
- Escape HTML in text fields
- Validate file uploads (type, size, content)

---

## 7. Performance Requirements

### Response Time Targets
- **95th percentile**: < 200ms
- **99th percentile**: < 500ms
- **Maximum**: < 2000ms

### Throughput Requirements
- **Expected RPS**: [requests per second]
- **Peak RPS**: [peak requests per second]
- **Concurrent Users**: [number of concurrent users]

### Caching Strategy
- **Cache Type**: `[Redis|Memcached|In-Memory|CDN]`
- **Cache Duration**: `[duration in seconds/minutes]`
- **Cache Keys**: `[key pattern]`
- **Cache Invalidation**: `[when to invalidate]`

### Database Optimization
- **Indexes Required**: `[field1, field2, composite_index(field3, field4)]`
- **Query Optimization**: `[specific optimization requirements]`
- **Connection Pooling**: `[pool size and configuration]`

---

## 8. Security Requirements

### Input Security
- Validate all input parameters
- Sanitize user input to prevent XSS
- Use parameterized queries to prevent SQL injection
- Implement rate limiting per user/IP
- Validate file uploads (type, size, content scanning)

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper session management
- Log security events for monitoring
- Follow OWASP security guidelines

### Access Control
- Implement role-based access control (RBAC)
- Validate user permissions for each operation
- Use principle of least privilege
- Implement audit logging for sensitive operations

---

## 9. Monitoring and Logging

### Logging Requirements
```json
{
  "timestamp": "2025-01-18T10:30:00Z",
  "level": "INFO|WARN|ERROR",
  "request_id": "req_123456789",
  "user_id": "user_123",
  "endpoint": "/api/v1/resource",
  "method": "POST",
  "status_code": 200,
  "response_time_ms": 150,
  "ip_address": "192.168.1.1",
  "user_agent": "MyApp/1.0.0",
  "message": "Request processed successfully"
}
```

### Metrics to Track
- Request count by endpoint
- Response time percentiles
- Error rate by error type
- Authentication failures
- Rate limit violations
- Database query performance

---

## 10. Testing Requirements

### Unit Tests
- Test all validation rules
- Test error handling scenarios
- Test business logic edge cases
- Achieve minimum 80% code coverage

### Integration Tests
- Test complete request/response flow
- Test authentication and authorization
- Test database interactions
- Test external service integrations

### Performance Tests
- Load testing with expected traffic
- Stress testing with peak traffic
- Endurance testing for memory leaks
- Database performance under load

---

## 11. Documentation Requirements

### API Documentation
- OpenAPI/Swagger specification
- Interactive API explorer
- Code examples in multiple languages
- Postman collection

### Developer Guide
- Getting started guide
- Authentication setup
- Common use cases and examples
- Troubleshooting guide

---

## 12. Example Implementation

### Sample Request
```bash
curl -X POST \
  'https://api.example.com/api/v1/applications' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'X-Request-ID: req_123456789' \
  -d '{
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "amount": 1000.00
  }'
```

### Sample Response
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "amount": 1000.00,
    "status": "pending",
    "created_at": "2025-01-18T10:30:00Z",
    "updated_at": "2025-01-18T10:30:00Z"
  }
}
```

---

## 13. Additional Considerations

### Versioning Strategy
- Use semantic versioning (v1, v2, etc.)
- Maintain backward compatibility
- Provide migration guides for breaking changes
- Deprecation timeline for old versions

### Internationalization
- Support multiple languages in error messages
- Handle different date/time formats
- Support various currency formats
- Consider right-to-left languages

### Compliance Requirements
- GDPR compliance for EU users
- Data retention policies
- Privacy policy compliance
- Industry-specific regulations (PCI DSS, HIPAA, etc.)

---

## Implementation Checklist

- [ ] API endpoint implemented with correct HTTP method
- [ ] Authentication and authorization implemented
- [ ] Request validation implemented
- [ ] Response format matches specification
- [ ] Error handling implemented for all scenarios
- [ ] Performance requirements met
- [ ] Security measures implemented
- [ ] Logging and monitoring configured
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] API documentation updated
- [ ] Code review completed
- [ ] Performance testing completed
- [ ] Security review completed

---

**Note**: Replace all placeholder values (marked with `[brackets]`) with actual values specific to your API requirements.