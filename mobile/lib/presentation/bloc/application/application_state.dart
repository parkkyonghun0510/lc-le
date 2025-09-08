import 'package:equatable/equatable.dart';

import '../../../data/models/enums.dart';
import '../../../domain/validation/application_form_values.dart';

class ApplicationState extends Equatable {
  final ApplicationFormValues form;
  final List<IDCardTypeOption> idCardTypes;
  final List<ProductTypeOption> productTypes;
  final bool isSubmitting;
  final List<String> lastErrors;
  final String? applicationId;

  const ApplicationState({
    required this.form,
    required this.idCardTypes,
    required this.productTypes,
    required this.isSubmitting,
    required this.lastErrors,
    required this.applicationId,
  });

  factory ApplicationState.initial() => ApplicationState(
        form: ApplicationFormValues(loanPurposes: []),
        idCardTypes: const [],
        productTypes: const [],
        isSubmitting: false,
        lastErrors: const [],
        applicationId: null,
      );

  ApplicationState copyWith({
    ApplicationFormValues? form,
    List<IDCardTypeOption>? idCardTypes,
    List<ProductTypeOption>? productTypes,
    bool? isSubmitting,
    List<String>? lastErrors,
    String? applicationId,
  }) => ApplicationState(
        form: form ?? this.form,
        idCardTypes: idCardTypes ?? this.idCardTypes,
        productTypes: productTypes ?? this.productTypes,
        isSubmitting: isSubmitting ?? this.isSubmitting,
        lastErrors: lastErrors ?? this.lastErrors,
        applicationId: applicationId ?? this.applicationId,
      );

  @override
  List<Object?> get props => [form, idCardTypes, productTypes, isSubmitting, lastErrors, applicationId];
}