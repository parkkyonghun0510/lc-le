import 'package:equatable/equatable.dart';
import '../../../domain/validation/application_form_values.dart';

abstract class ApplicationEvent extends Equatable {
  const ApplicationEvent();
  @override
  List<Object?> get props => [];
}

class InitializeEnums extends ApplicationEvent {}

class UpdateForm extends ApplicationEvent {
  final ApplicationFormValues values;
  const UpdateForm(this.values);
  @override
  List<Object?> get props => [values];
}

class SubmitStep extends ApplicationEvent {
  final int stepIndex;
  const SubmitStep(this.stepIndex);
  @override
  List<Object?> get props => [stepIndex];
}