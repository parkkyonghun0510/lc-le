import '../../core/network/api_client.dart';
import '../models/application_dto.dart';

class ApplicationRepository {
  final ApiClient api;
  ApplicationRepository(this.api);

  Future<String> create(ApplicationDto dto) async {
    final resp = await api.dio.post('applications/', data: dto.toJson());
    final id = resp.data['id']?.toString();
    if (id == null || id.isEmpty) {
      throw Exception('Create application failed: missing id in response');
    }
    return id;
  }

  Future<void> update(String applicationId, ApplicationDto dto) async {
    await api.dio.put('applications/$applicationId', data: dto.toJson());
  }
}