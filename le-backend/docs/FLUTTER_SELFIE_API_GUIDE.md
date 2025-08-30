# Flutter Selfie Capture API Integration Guide

## Overview

This API enables Flutter applications to capture, upload, and manage customer selfies as part of the loan application workflow. The system supports three user roles with different permissions and provides comprehensive metadata tracking.

## User Roles and Permissions

### 1. Officer Role
- **Permissions**: Can upload selfies for their own customer applications
- **Typical Use**: Field officers capturing customer selfies during loan application visits
- **Access**: Limited to applications they created

### 2. Manager Role  
- **Permissions**: Can upload and validate selfies for all applications in their department/branch
- **Typical Use**: Review and approve selfies, manage team workflows
- **Access**: Full access to view and validate selfies

### 3. Admin Role
- **Permissions**: Full access to all selfie operations across the system
- **Typical Use**: System administration, troubleshooting, cross-department management
- **Access**: Unrestricted access to all selfie operations

## Selfie Types

The system supports four types of selfie captures:

1. **`customer_profile`** - Customer's profile photo
2. **`customer_with_officer`** - Customer with the loan officer
3. **`id_verification`** - Customer with their ID document
4. **`location_verification`** - Customer at the location for verification

## API Endpoints

### Base URL: `https://your-api-domain.com/api/v1/selfies`

### Authentication
All endpoints require JWT authentication. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### 1. Upload Selfie

**Endpoint**: `POST /upload`  
**Description**: Upload a selfie image with metadata
**Content-Type**: `multipart/form-data`

#### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG, PNG, etc.) |
| `application_id` | UUID | Yes | Customer application ID |
| `selfie_type` | Enum | Yes | One of: `customer_profile`, `customer_with_officer`, `id_verification`, `location_verification` |
| `customer_id_number` | String | No | Customer's ID number for verification |
| `customer_name` | String | No | Customer's full name |
| `location_latitude` | Float | No | GPS latitude coordinate |
| `location_longitude` | Float | No | GPS longitude coordinate |
| `location_address` | String | No | Human-readable address |
| `notes` | String | No | Additional notes (max 500 chars) |

#### Response (Success - 201)
```json
{
  \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"application_id\": \"123e4567-e89b-12d3-a456-426614174000\",
  \"file_path\": \"applications/123e4567/selfies/customer_profile/image_20231101.jpg\",
  \"original_filename\": \"customer_selfie.jpg\",
  \"selfie_type\": \"customer_profile\",
  \"metadata\": {
    \"selfie_type\": \"customer_profile\",
    \"captured_at\": \"2023-11-01T10:30:00Z\",
    \"captured_by_user_id\": \"user123\",
    \"customer_id_number\": \"ID123456789\",
    \"customer_name\": \"John Doe\",
    \"location_latitude\": 11.5564,
    \"location_longitude\": 104.9282,
    \"location_address\": \"Phnom Penh, Cambodia\",
    \"face_detection_confidence\": null,
    \"image_quality_score\": null,
    \"is_validated\": false,
    \"validation_notes\": null,
    \"notes\": \"Customer verification at branch\"
  },
  \"created_at\": \"2023-11-01T10:30:00Z\",
  \"status\": \"pending_validation\"
}
```

#### Flutter Implementation Example

```dart
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path/path.dart';

class SelfieService {
  final String baseUrl = 'https://your-api-domain.com/api/v1';
  final String? accessToken;

  SelfieService({required this.accessToken});

  Future<Map<String, dynamic>> uploadSelfie({
    required File imageFile,
    required String applicationId,
    required String selfieType,
    String? customerIdNumber,
    String? customerName,
    double? latitude,
    double? longitude,
    String? address,
    String? notes,
  }) async {
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/selfies/upload'),
    );

    // Add headers
    request.headers['Authorization'] = 'Bearer $accessToken';

    // Add file
    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        imageFile.path,
        filename: basename(imageFile.path),
      ),
    );

    // Add form fields
    request.fields['application_id'] = applicationId;
    request.fields['selfie_type'] = selfieType;
    
    if (customerIdNumber != null) {
      request.fields['customer_id_number'] = customerIdNumber;
    }
    if (customerName != null) {
      request.fields['customer_name'] = customerName;
    }
    if (latitude != null) {
      request.fields['location_latitude'] = latitude.toString();
    }
    if (longitude != null) {
      request.fields['location_longitude'] = longitude.toString();
    }
    if (address != null) {
      request.fields['location_address'] = address;
    }
    if (notes != null) {
      request.fields['notes'] = notes;
    }

    var response = await request.send();
    var responseBody = await response.stream.bytesToString();

    if (response.statusCode == 201) {
      return json.decode(responseBody);
    } else {
      throw Exception('Failed to upload selfie: ${response.statusCode}');
    }
  }
}
```

### 2. Get Selfies List

**Endpoint**: `GET /`  
**Description**: Retrieve a paginated list of selfies

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `size` | Integer | No | Items per page (default: 10, max: 100) |
| `application_id` | UUID | No | Filter by application ID |
| `selfie_type` | Enum | No | Filter by selfie type |
| `status` | String | No | Filter by status |
| `captured_by_user_id` | UUID | No | Filter by user who captured |

#### Response (Success - 200)
```json
{
  \"items\": [
    {
      \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
      \"application_id\": \"123e4567-e89b-12d3-a456-426614174000\",
      \"customer_name\": \"John Doe\",
      \"selfie_type\": \"customer_profile\",
      \"captured_at\": \"2023-11-01T10:30:00Z\",
      \"captured_by\": {
        \"id\": \"user123\",
        \"username\": \"officer_john\",
        \"first_name\": \"John\",
        \"last_name\": \"Smith\"
      },
      \"status\": \"pending_validation\",
      \"thumbnail_url\": \"/api/v1/selfies/550e8400-e29b-41d4-a716-446655440000/thumbnail\"
    }
  ],
  \"total\": 25,
  \"page\": 1,
  \"size\": 10,
  \"pages\": 3
}
```

### 3. Get Single Selfie

**Endpoint**: `GET /{selfie_id}`  
**Description**: Retrieve detailed information about a specific selfie

#### Response (Success - 200)
```json
{
  \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"application_id\": \"123e4567-e89b-12d3-a456-426614174000\",
  \"file_path\": \"applications/123e4567/selfies/customer_profile/image_20231101.jpg\",
  \"original_filename\": \"customer_selfie.jpg\",
  \"selfie_type\": \"customer_profile\",
  \"metadata\": {
    \"selfie_type\": \"customer_profile\",
    \"captured_at\": \"2023-11-01T10:30:00Z\",
    \"captured_by_user_id\": \"user123\",
    \"customer_id_number\": \"ID123456789\",
    \"customer_name\": \"John Doe\",
    \"location_latitude\": 11.5564,
    \"location_longitude\": 104.9282,
    \"location_address\": \"Phnom Penh, Cambodia\",
    \"face_detection_confidence\": 0.95,
    \"image_quality_score\": 8.5,
    \"is_validated\": true,
    \"validation_notes\": \"Clear image, good quality\",
    \"notes\": \"Customer verification at branch\"
  },
  \"created_at\": \"2023-11-01T10:30:00Z\",
  \"status\": \"validated\"
}
```

### 4. Validate Selfie (Manager/Admin Only)

**Endpoint**: `POST /{selfie_id}/validate`  
**Description**: Approve or reject a selfie (managers and admins only)

#### Request Body
```json
{
  \"selfie_id\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"is_approved\": true,
  \"validation_notes\": \"Clear image, customer identity verified\",
  \"face_detection_confidence\": 0.95,
  \"image_quality_score\": 8.5
}
```

#### Response (Success - 200)
```json
{
  \"selfie_id\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"is_approved\": true,
  \"validation_notes\": \"Clear image, customer identity verified\",
  \"validated_by\": \"manager123\",
  \"validated_at\": \"2023-11-01T11:00:00Z\"
}
```

### 5. Download Selfie

**Endpoint**: `GET /{selfie_id}/download`  
**Description**: Get a presigned URL to download the selfie image

#### Response (Success - 200)
```json
{
  \"download_url\": \"https://minio-bucket.com/presigned-url-with-token\"
}
```

### 6. Delete Selfie (Admin/Owner Only)

**Endpoint**: `DELETE /{selfie_id}`  
**Description**: Delete a selfie (admins or the user who captured it)

#### Response (Success - 200)
```json
{
  \"message\": \"Selfie deleted successfully\"
}
```

## Error Responses

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 413 | Payload Too Large - Image exceeds size limit |
| 422 | Unprocessable Entity - Validation errors |
| 500 | Internal Server Error |

### Error Response Format
```json
{
  \"detail\": \"Error message describing what went wrong\"
}
```

## Flutter Integration Best Practices

### 1. Image Capture Guidelines

```dart
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';

class SelfieCapture {
  final ImagePicker _picker = ImagePicker();
  
  Future<File?> captureFromCamera() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85, // Compress to reduce file size
      maxWidth: 1920,
      maxHeight: 1080,
    );
    
    return image != null ? File(image.path) : null;
  }
  
  Future<Position?> getCurrentLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;
    
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return null;
    }
    
    return await Geolocator.getCurrentPosition();
  }
}
```

### 2. Offline Support

```dart
class OfflineSelfieQueue {
  final List<PendingSelfie> _queue = [];
  
  void addToQueue(PendingSelfie selfie) {
    _queue.add(selfie);
    _saveToLocalStorage();
  }
  
  Future<void> processQueue() async {
    while (_queue.isNotEmpty && await _hasInternetConnection()) {
      final selfie = _queue.first;
      try {
        await SelfieService().uploadSelfie(/* parameters */);
        _queue.removeFirst();
        _saveToLocalStorage();
      } catch (e) {
        // Handle upload failure
        break;
      }
    }
  }
}
```

### 3. Error Handling

```dart
try {
  final response = await selfieService.uploadSelfie(
    imageFile: imageFile,
    applicationId: applicationId,
    selfieType: 'customer_profile',
  );
  
  // Success - update UI
  _showSuccessMessage('Selfie uploaded successfully');
  
} on SocketException {
  // No internet connection
  _addToOfflineQueue();
  
} on HttpException catch (e) {
  if (e.statusCode == 413) {
    _showError('Image too large. Please try a smaller image.');
  } else if (e.statusCode == 403) {
    _showError('You don\\'t have permission to upload for this application.');
  } else {
    _showError('Upload failed. Please try again.');
  }
  
} catch (e) {
  _showError('Unexpected error occurred.');
}
```

## Image Quality Guidelines

### Recommended Specifications
- **Format**: JPEG, PNG
- **Maximum Size**: 10MB
- **Recommended Resolution**: 1920x1080 or lower
- **Quality**: 85% compression for optimal balance

### Image Validation Tips
- Ensure good lighting conditions
- Customer's face should be clearly visible
- Avoid blurry or shaky images
- Include relevant context (for location verification)

## Security Considerations

1. **Always validate permissions** before allowing uploads
2. **Use HTTPS** for all API communications
3. **Implement proper token refresh** mechanisms
4. **Store sensitive data securely** on the device
5. **Validate image content** before upload when possible

## Testing

### Test User Accounts
Request test accounts from your system administrator with different roles:
- Officer role for basic selfie capture testing
- Manager role for validation workflow testing
- Admin role for full system testing

### Test Applications
Create test customer applications to use for selfie uploads during development.

## Support and Troubleshooting

### Common Issues

1. **Upload fails with 413 error**: Image too large
   - Solution: Compress image or reduce resolution

2. **403 Forbidden error**: Permission denied
   - Solution: Verify user has access to the application

3. **Network timeouts**: Large images on slow connections
   - Solution: Implement retry logic and progress indicators

### Debug Information
Include these details when reporting issues:
- User role and ID
- Application ID
- Selfie type
- Image file size and format
- Error message and status code
- Device and app version

For additional support, contact the development team with detailed error logs and reproduction steps.