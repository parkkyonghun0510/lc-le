import '../../core/network/api_client.dart';
import '../models/enums.dart';

class EnumsRepository {
  final ApiClient api;
  EnumsRepository(this.api);

  Future<List<IDCardTypeOption>> fetchIdCardTypes() async {
    final resp = await api.dio.get('enums/id-card-types');
    return (resp.data as List)
        .map((e) => IDCardTypeOption.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ProductTypeOption>> fetchProductTypes() async {
    final resp = await api.dio.get('enums/product-types');
    return (resp.data as List)
        .map((e) => ProductTypeOption.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}