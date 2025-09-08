import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/repositories/application_repository.dart';
import '../../../data/repositories/enums_repository.dart';
import '../../../domain/validation/application_form_values.dart';
import 'application_event.dart';
import 'application_state.dart';

class ApplicationBloc extends Bloc<ApplicationEvent, ApplicationState> {
  final ApplicationRepository applicationRepository;
  final EnumsRepository enumsRepository;

  ApplicationBloc({required this.applicationRepository, required this.enumsRepository})
      : super(ApplicationState.initial()) {
    on<InitializeEnums>(_onInitializeEnums);
    on<UpdateForm>(_onUpdateForm);
    on<SubmitStep>(_onSubmitStep);
  }

  Future<void> _onInitializeEnums(InitializeEnums event, Emitter<ApplicationState> emit) async {
    try {
      final idList = await enumsRepository.fetchIdCardTypes();
      final prodList = await enumsRepository.fetchProductTypes();
      emit(state.copyWith(idCardTypes: idList, productTypes: prodList));
    } catch (_) {
      // ignore fetch errors
    }
  }

  void _onUpdateForm(UpdateForm event, Emitter<ApplicationState> emit) {
    emit(state.copyWith(form: event.values));
  }

  Future<void> _onSubmitStep(SubmitStep event, Emitter<ApplicationState> emit) async {
    emit(state.copyWith(isSubmitting: true, lastErrors: []));
    final result = validateStep(event.stepIndex, state.form);
    if (!result.isValid) {
      emit(state.copyWith(isSubmitting: false, lastErrors: result.errors));
      return;
    }

    try {
      if (state.applicationId == null) {
        final id = await applicationRepository.create(state.form.toDto());
        emit(state.copyWith(applicationId: id, isSubmitting: false));
      } else {
        await applicationRepository.update(state.applicationId!, state.form.toDto());
        emit(state.copyWith(isSubmitting: false));
      }
    } catch (e) {
      emit(state.copyWith(isSubmitting: false, lastErrors: ['Failed to submit: $e']));
    }
  }

  ValidationResult validateStep(int stepIndex, ApplicationFormValues form) {
    switch (stepIndex) {
      case 0:
        return validateCustomerInformation(form);
      case 1:
        return validateLoanInformation(form);
      case 2:
        return validateGuarantorInformation(form);
      default:
        return const ValidationResult(isValid: true, errors: []);
    }
  }
}