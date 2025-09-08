import '../../core/constants/regex.dart';
import '../../core/utils/date_utils.dart';
import '../../data/models/application_dto.dart';

class ValidationResult {
  final bool isValid;
  final List<String> errors;
  const ValidationResult({required this.isValid, required this.errors});
}

class ApplicationFormValues {
  String? fullNameLatin;
  String? idCardType;
  String? idNumber;
  String? phone;
  String? dateOfBirth; // YYYY-MM-DD
  String? portfolioOfficerName;

  String? requestedAmount; // input text
  int? desiredLoanTerm; // months
  String? productType;
  String? requestedDisbursementDate; // YYYY-MM-DD
  List<String>? loanPurposes;
  String? purposeDetails;

  String? guarantorName;
  String? guarantorPhone;

  ApplicationFormValues({
    this.fullNameLatin,
    this.idCardType,
    this.idNumber,
    this.phone,
    this.dateOfBirth,
    this.portfolioOfficerName,
    this.requestedAmount,
    this.desiredLoanTerm,
    this.productType,
    this.requestedDisbursementDate,
    this.loanPurposes,
    this.purposeDetails,
    this.guarantorName,
    this.guarantorPhone,
  });

  ApplicationFormValues copyWith({
    String? fullNameLatin,
    String? idCardType,
    String? idNumber,
    String? phone,
    String? dateOfBirth,
    String? portfolioOfficerName,
    String? requestedAmount,
    int? desiredLoanTerm,
    String? productType,
    String? requestedDisbursementDate,
    List<String>? loanPurposes,
    String? purposeDetails,
    String? guarantorName,
    String? guarantorPhone,
  }) => ApplicationFormValues(
        fullNameLatin: fullNameLatin ?? this.fullNameLatin,
        idCardType: idCardType ?? this.idCardType,
        idNumber: idNumber ?? this.idNumber,
        phone: phone ?? this.phone,
        dateOfBirth: dateOfBirth ?? this.dateOfBirth,
        portfolioOfficerName: portfolioOfficerName ?? this.portfolioOfficerName,
        requestedAmount: requestedAmount ?? this.requestedAmount,
        desiredLoanTerm: desiredLoanTerm ?? this.desiredLoanTerm,
        productType: productType ?? this.productType,
        requestedDisbursementDate: requestedDisbursementDate ?? this.requestedDisbursementDate,
        loanPurposes: loanPurposes ?? this.loanPurposes,
        purposeDetails: purposeDetails ?? this.purposeDetails,
        guarantorName: guarantorName ?? this.guarantorName,
        guarantorPhone: guarantorPhone ?? this.guarantorPhone,
      );

  ApplicationDto toDto() {
    final amount = (requestedAmount != null) ? double.tryParse(requestedAmount!.trim()) : null;
    return ApplicationDto(
      id_card_type: idCardType,
      id_number: idNumber,
      full_name_latin: fullNameLatin,
      phone: phone,
      date_of_birth: dateOfBirth,
      portfolio_officer_name: portfolioOfficerName,
      requested_amount: amount,
      desired_loan_term: desiredLoanTerm,
      product_type: productType,
      requested_disbursement_date: requestedDisbursementDate,
      loan_purposes: loanPurposes,
      purpose_details: purposeDetails,
      guarantor_name: guarantorName,
      guarantor_phone: guarantorPhone,
    );
  }
}

ValidationResult validateCustomerInformation(ApplicationFormValues v) {
  final errors = <String>[];

  if (v.fullNameLatin == null || v.fullNameLatin!.trim().isEmpty) {
    errors.add('Customer name is required');
  } else if (v.fullNameLatin!.trim().length < 2) {
    errors.add('Customer name must be at least 2 characters long');
  } else if (v.fullNameLatin!.trim().length > 255) {
    errors.add('Customer name cannot exceed 255 characters');
  }

  if (v.idCardType == null || v.idCardType!.trim().isEmpty) {
    errors.add('ID card type is required');
  }

  if (v.idNumber == null || v.idNumber!.trim().isEmpty) {
    errors.add('ID card number is required');
  } else if (!idCardRegex.hasMatch(v.idNumber!.trim())) {
    errors.add('ID card number must contain only letters and numbers');
  } else if (v.idNumber!.trim().length > 50) {
    errors.add('ID card number cannot exceed 50 characters');
  }

  if (v.phone == null || v.phone!.trim().isEmpty) {
    errors.add('Phone number is required');
  } else if (!phoneRegex.hasMatch(v.phone!.trim())) {
    errors.add('Please enter a valid phone number');
  } else if (v.phone!.trim().length > 20) {
    errors.add('Phone number cannot exceed 20 characters');
  }

  if (v.portfolioOfficerName != null && v.portfolioOfficerName!.trim().length > 255) {
    errors.add('Portfolio officer name cannot exceed 255 characters');
  }

  if (v.dateOfBirth != null && v.dateOfBirth!.isNotEmpty) {
    try {
      final birth = DateTime.parse(v.dateOfBirth!);
      final today = DateTime.now();
      final age = today.year - birth.year;
      if (age < 18) errors.add('Customer must be at least 18 years old');
      if (age > 100) errors.add('Please enter a valid date of birth');
    } catch (_) {
      errors.add('Invalid date of birth format (expected YYYY-MM-DD)');
    }
  }

  return ValidationResult(isValid: errors.isEmpty, errors: errors);
}

ValidationResult validateLoanInformation(ApplicationFormValues v) {
  final errors = <String>[];

  final amtStr = v.requestedAmount?.trim();
  if (amtStr == null || amtStr.isEmpty) {
    errors.add('Requested amount is required');
  } else {
    final amount = double.tryParse(amtStr);
    if (amount == null || amount <= 0) {
      errors.add('Requested amount must be a positive number');
    } else if (amount > 10000000) {
      errors.add('Requested amount cannot exceed 10,000,000');
    } else if (amount < 100) {
      errors.add('Requested amount must be at least 100');
    }
  }

  if (v.desiredLoanTerm == null) {
    errors.add('Loan term is required');
  } else if (v.desiredLoanTerm! <= 0) {
    errors.add('Loan term must be a positive number');
  } else if (v.desiredLoanTerm! > 360) {
    errors.add('Loan term cannot exceed 360 months');
  }

  if (v.productType == null || v.productType!.isEmpty) {
    errors.add('Product type is required');
  } else if (v.productType!.length > 50) {
    errors.add('Product type cannot exceed 50 characters');
  }

  final disbErr = DateValidators.validateDisbursementDate(v.requestedDisbursementDate);
  if (disbErr != null) errors.add(disbErr);

  if (v.loanPurposes == null || v.loanPurposes!.isEmpty) {
    errors.add('Loan purpose is required');
  }

  if (v.purposeDetails != null && v.purposeDetails!.trim().length > 1000) {
    errors.add('Purpose details cannot exceed 1000 characters');
  }

  return ValidationResult(isValid: errors.isEmpty, errors: errors);
}

ValidationResult validateGuarantorInformation(ApplicationFormValues v) {
  final errors = <String>[];

  if (v.guarantorName != null && v.guarantorName!.trim().isNotEmpty) {
    if (v.guarantorName!.trim().length < 2) {
      errors.add('Guarantor name must be at least 2 characters long');
    } else if (v.guarantorName!.trim().length > 255) {
      errors.add('Guarantor name cannot exceed 255 characters');
    }
  }

  if (v.guarantorPhone != null && v.guarantorPhone!.trim().isNotEmpty) {
    if (!phoneRegex.hasMatch(v.guarantorPhone!.trim())) {
      errors.add('Please enter a valid guarantor phone number');
    } else if (v.guarantorPhone!.trim().length > 20) {
      errors.add('Guarantor phone number cannot exceed 20 characters');
    }
  }

  return ValidationResult(isValid: errors.isEmpty, errors: errors);
}

ValidationResult validateEntireForm(ApplicationFormValues v) {
  final e1 = validateCustomerInformation(v).errors;
  final e2 = validateLoanInformation(v).errors;
  final e3 = validateGuarantorInformation(v).errors;
  final all = <String>[...e1, ...e2, ...e3];
  return ValidationResult(isValid: all.isEmpty, errors: all);
}