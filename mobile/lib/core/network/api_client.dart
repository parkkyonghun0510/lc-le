import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:async';

typedef TokenProvider = Future<String?> Function();

class ApiConfig {
  static String baseUrl = 'https://backend-production-478f.up.railway.app/api/v1/';
}

class ApiClient {
  final Dio dio;
  TokenProvider? _tokenProvider;
  String? _accessToken; // in-memory token fallback
  bool _isRefreshing = false;

  // Secure storage for tokens
  static const String _kAccessTokenKey = 'access_token';
  static const String _kRefreshTokenKey = 'refresh_token';
  static const String _kExpiresAtKey = 'expires_at';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  ApiClient._internal(this.dio);

  factory ApiClient() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {'Accept': 'application/json'},
    ));

    final client = ApiClient._internal(dio);

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        String? token;
        if (client._tokenProvider != null) {
          token = await client._tokenProvider!();
        }
        token ??= client._accessToken;
        // Lazy load from secure storage if needed
        token ??= await _storage.read(key: _kAccessTokenKey);
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (err, handler) async {
        final response = err.response;
        final requestOptions = err.requestOptions;
        if (response?.statusCode == 401 && requestOptions.extra['__retry'] != true) {
          // Attempt token refresh if a refresh token exists
          final refreshed = await client._tryRefreshToken();
          if (refreshed) {
            // Retry original request with new token
            final newAccess = client._accessToken ?? await _storage.read(key: _kAccessTokenKey);
            if (newAccess != null) {
              requestOptions.headers['Authorization'] = 'Bearer $newAccess';
            }
            requestOptions.extra['__retry'] = true;
            try {
              final cloneResponse = await dio.fetch(requestOptions);
              return handler.resolve(cloneResponse);
            } catch (e) {
              return handler.next(err);
            }
          } else {
            // Clear tokens when refresh fails
            await client.clearTokens();
          }
        }
        return handler.next(err);
      },
    ));

    // Default token provider: in-memory -> secure storage
    client.setTokenProvider(() async {
      if (client._accessToken != null && client._accessToken!.isNotEmpty) return client._accessToken;
      final stored = await _storage.read(key: _kAccessTokenKey);
      client._accessToken = stored;
      return stored;
    });

    return client;
  }

  void setTokenProvider(TokenProvider provider) {
    _tokenProvider = provider;
  }

  void setAccessToken(String? token) {
    _accessToken = token;
  }

  String? get accessToken => _accessToken;

  Future<void> persistTokens({
    required String accessToken,
    String? refreshToken,
    int? expiresInSeconds,
  }) async {
    _accessToken = accessToken;
    await _storage.write(key: _kAccessTokenKey, value: accessToken);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.write(key: _kRefreshTokenKey, value: refreshToken);
    }
    if (expiresInSeconds != null) {
      final expiresAt = DateTime.now().add(Duration(seconds: expiresInSeconds)).millisecondsSinceEpoch.toString();
      await _storage.write(key: _kExpiresAtKey, value: expiresAt);
    }
  }

  Future<void> loadTokens() async {
    _accessToken = await _storage.read(key: _kAccessTokenKey);
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    await _storage.delete(key: _kAccessTokenKey);
    await _storage.delete(key: _kRefreshTokenKey);
    await _storage.delete(key: _kExpiresAtKey);
  }

  Future<bool> _tryRefreshToken() async {
    if (_isRefreshing) {
      // Wait for ongoing refresh
      while (_isRefreshing) {
        await Future.delayed(const Duration(milliseconds: 50));
      }
      return _accessToken != null && _accessToken!.isNotEmpty;
    }

    final refreshToken = await _storage.read(key: _kRefreshTokenKey);
    if (refreshToken == null || refreshToken.isEmpty) return false;

    _isRefreshing = true;
    try {
      final resp = await dio.post(
        'auth/refresh',
        data: {'refresh_token': refreshToken},
        options: Options(headers: {
          'Authorization': null,
          'Content-Type': 'application/json',
        }),
      );
      final data = Map<String, dynamic>.from(resp.data as Map);
      final newAccess = data['access_token'] as String?;
      final newRefresh = data['refresh_token'] as String?;
      final expiresIn = data['expires_in'] as int?;
      if (newAccess != null && newAccess.isNotEmpty) {
        await persistTokens(accessToken: newAccess, refreshToken: newRefresh, expiresInSeconds: expiresIn);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    } finally {
      _isRefreshing = false;
    }
  }

  // Simple login helper for mobile clients
  Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    final resp = await dio.post(
      'auth/login', // no leading slash so it appends to baseUrl
      data: {
        'username': username,
        'password': password,
      },
      options: Options(headers: {
        // ensure no stale auth header when logging in
        'Authorization': null,
        'Content-Type': 'application/json',
      }),
    );
    final data = Map<String, dynamic>.from(resp.data as Map);
    final token = data['access_token'] as String?;
    final refresh = data['refresh_token'] as String?;
    final expiresIn = data['expires_in'] as int?;
    if (token != null && token.isNotEmpty) {
      await persistTokens(accessToken: token, refreshToken: refresh, expiresInSeconds: expiresIn);
    }
    return data;
  }
}