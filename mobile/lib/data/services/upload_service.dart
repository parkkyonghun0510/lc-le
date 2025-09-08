import 'dart:io';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';

import '../../core/network/api_client.dart';

class UploadException implements Exception {
  final String message;
  final int? statusCode;
  UploadException(this.message, {this.statusCode});

  @override
  String toString() => 'UploadException(statusCode: $statusCode, message: $message)';
}

class UploadService {
  final ApiClient api;

  /// Max selfie image size (defaults to 10MB as per backend MAX_IMAGE_SIZE)
  int maxImageBytes;

  /// Max general file size (defaults to 10MB as per backend MAX_FILE_SIZE)
  int maxFileBytes;

  /// Allowed file MIME types (should mirror backend settings.ALLOWED_FILE_TYPES)
  final Set<String> allowedTypes;

  UploadService(
    this.api, {
    this.maxImageBytes = 10 * 1024 * 1024,
    this.maxFileBytes = 10 * 1024 * 1024,
    Set<String>? allowedTypes,
  }) : allowedTypes = allowedTypes ?? {
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };

  String _detectMimeType(String path) {
    final type = lookupMimeType(path) ?? 'application/octet-stream';
    return type;
  }

  void _validateFile(String path, {required bool isImage}) {
    final file = File(path);
    if (!file.existsSync()) {
      throw UploadException('File not found at path: $path');
    }
    final length = file.lengthSync();
    if (isImage) {
      if (length > maxImageBytes) {
        throw UploadException('Image too large. Maximum size: ${maxImageBytes ~/ (1024 * 1024)}MB');
      }
    } else {
      if (length > maxFileBytes) {
        throw UploadException('File too large. Maximum size: ${maxFileBytes ~/ (1024 * 1024)}MB');
      }
    }

    final contentType = _detectMimeType(path);
    if (!allowedTypes.contains(contentType)) {
      throw UploadException('Unsupported file type: $contentType');
    }
    if (isImage && !contentType.startsWith('image/')) {
      throw UploadException('File must be an image for selfie upload. Got: $contentType');
    }
  }

  Future<Map<String, dynamic>> uploadSelfie({
    required String imagePath,
    required String applicationId,
    required String selfieType,
    String? customerIdNumber,
    String? customerName,
    double? locationLatitude,
    double? locationLongitude,
    String? locationAddress,
    String? notes,
    void Function(int sent, int total)? onProgress,
  }) async {
    _validateFile(imagePath, isImage: true);
    final file = File(imagePath);
    final contentType = _detectMimeType(imagePath);

    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.uri.pathSegments.isNotEmpty ? file.uri.pathSegments.last : 'selfie.jpg',
        contentType: MediaType.parse(contentType),
      ),
      'application_id': applicationId,
      'selfie_type': selfieType,
      if (customerIdNumber != null) 'customer_id_number': customerIdNumber,
      if (customerName != null) 'customer_name': customerName,
      if (locationLatitude != null) 'location_latitude': locationLatitude.toString(),
      if (locationLongitude != null) 'location_longitude': locationLongitude.toString(),
      if (locationAddress != null) 'location_address': locationAddress,
      if (notes != null) 'notes': notes,
    });

    try {
      final resp = await api.dio.post(
        'selfies/upload',
        data: form,
        onSendProgress: onProgress,
      );
      return Map<String, dynamic>.from(resp.data as Map);
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final message = e.response?.data is Map
          ? (e.response?.data['detail']?.toString() ?? e.message)
          : e.message;
      throw UploadException(message ?? 'Upload failed', statusCode: status);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> uploadFile({
    required String filePath,
    String? applicationId,
    String? folderId,
    String? documentType, // photos | references | supporting_docs
    void Function(int sent, int total)? onProgress,
  }) async {
    _validateFile(filePath, isImage: false);
    final file = File(filePath);
    final contentType = _detectMimeType(filePath);

    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.uri.pathSegments.isNotEmpty ? file.uri.pathSegments.last : 'upload.bin',
        contentType: MediaType.parse(contentType),
      ),
      if (applicationId != null) 'application_id': applicationId,
      if (folderId != null) 'folder_id': folderId,
    });

    try {
      final resp = await api.dio.post(
        'files/upload',
        data: form,
        queryParameters: {
          if (documentType != null) 'document_type': documentType,
        },
        onSendProgress: onProgress,
      );
      return Map<String, dynamic>.from(resp.data as Map);
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final message = e.response?.data is Map
          ? (e.response?.data['detail']?.toString() ?? e.message)
          : e.message;
      throw UploadException(message ?? 'Upload failed', statusCode: status);
    } catch (e) {
      rethrow;
    }
  }
}