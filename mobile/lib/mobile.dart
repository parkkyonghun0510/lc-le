// Public exports and quick-start notes
// Add these to your pubspec.yaml:
// dependencies:
//   dio: ^5.4.0
//   get: ^4.6.6
//   flutter_bloc: ^8.1.3
//   equatable: ^2.0.5
//   intl: ^0.19.0
//
// Then, you can import 'package:mobile/mobile.dart'; after copying this folder under lib/ as `mobile/`.

library mobile_lib;

export 'core/network/api_client.dart';
export 'core/constants/regex.dart';
export 'core/utils/date_utils.dart';

export 'data/models/application_dto.dart';
export 'data/models/enums.dart';

export 'data/repositories/application_repository.dart';
export 'data/repositories/enums_repository.dart';

export 'domain/validation/application_form_values.dart';

export 'presentation/getx/application_controller.dart';

export 'presentation/bloc/application/application_event.dart';
export 'presentation/bloc/application/application_state.dart';
export 'presentation/bloc/application/application_bloc.dart';