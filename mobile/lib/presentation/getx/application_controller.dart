import 'package:get/get.dart';

import '../../core/network/api_client.dart';
import '../../data/models/enums.dart';
import '../../data/repositories/application_repository.dart';
import '../../data/repositories/enums_repository.dart';
import '../../domain/validation/application_form_values.dart';

class ApplicationController extends GetxController {
  final EnumsRepository enumsRepository;
  final ApplicationRepository applicationRepository;
  final ApiClient api;

  ApplicationController({
    required this.enumsRepository,
    required this.applicationRepository,
    required this.api,
  });

  final RxBool loading = false.obs;
  final RxString? error = RxString('');
  final RxList<IDCardTypeOption> idCardTypes = <IDCardTypeOption>[].obs;
  final RxList<ProductTypeOption> productTypes = <ProductTypeOption>[].obs;

  final RxnString applicationId = RxnString();

  Future<void> initialize({required String username, required String password}) async {
    loading.value = true;
    error?.value = '';
    try {
      await api.login(username: username, password: password);
      await fetchEnums();
    } catch (e) {
      error?.value = e.toString();
    } finally {
      loading.value = false;
    }
  }

  Future<void> fetchEnums() async {
    loading.value = true;
    error?.value = '';
    try {
      final ids = await enumsRepository.fetchIdCardTypes();
      final products = await enumsRepository.fetchProductTypes();
      idCardTypes.assignAll(ids);
      productTypes.assignAll(products);
    } catch (e) {
      error?.value = e.toString();
    } finally {
      loading.value = false;
    }
  }

  bool validateStep(ApplicationFormValues values) {
    return validateCustomerInformation(values).isValid;
  }

  Future<void> submitStep(ApplicationFormValues values) async {
    if (!validateStep(values)) {
      throw Exception('Validation failed');
    }
    if (applicationId.value == null) {
      final id = await applicationRepository.create(values.toDto());
      applicationId.value = id;
    } else {
      await applicationRepository.update(applicationId.value!, values.toDto());
    }
  }
}