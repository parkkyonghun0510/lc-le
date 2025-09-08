import 'package:get/get.dart';

import '../../core/network/api_client.dart';
import '../../data/repositories/application_repository.dart';
import '../../data/repositories/enums_repository.dart';
import '../getx/application_controller.dart';

/// A simple service to login as admin, initialize enums, and expose controller.
class AdminBootstrapService {
  late final ApiClient api;
  late final EnumsRepository enumsRepository;
  late final ApplicationRepository applicationRepository;
  late final ApplicationController controller;

  AdminBootstrapService({ApiClient? apiClient}) {
    api = apiClient ?? ApiClient();
    enumsRepository = EnumsRepository(api);
    applicationRepository = ApplicationRepository(api);
    controller = ApplicationController(
      enumsRepository: enumsRepository,
      applicationRepository: applicationRepository,
      api: api,
    );
  }

  Future<void> initializeAdmin() async {
    await controller.initialize(username: 'admin', password: '12345678');
  }
}