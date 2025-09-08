class ApplicationDto {
  String? id_card_type;
  String? id_number;
  String? full_name_latin;
  String? phone;
  String? date_of_birth; // YYYY-MM-DD
  String? portfolio_officer_name;

  double? requested_amount;
  int? desired_loan_term;
  String? product_type;
  String? requested_disbursement_date;
  List<String>? loan_purposes;
  String? purpose_details;

  String? guarantor_name;
  String? guarantor_phone;

  ApplicationDto({
    this.id_card_type,
    this.id_number,
    this.full_name_latin,
    this.phone,
    this.date_of_birth,
    this.portfolio_officer_name,
    this.requested_amount,
    this.desired_loan_term,
    this.product_type,
    this.requested_disbursement_date,
    this.loan_purposes,
    this.purpose_details,
    this.guarantor_name,
    this.guarantor_phone,
  });

  Map<String, dynamic> toJson() => {
        if (id_card_type != null) 'id_card_type': id_card_type,
        if (id_number != null) 'id_number': id_number,
        if (full_name_latin != null) 'full_name_latin': full_name_latin,
        if (phone != null) 'phone': phone,
        if (date_of_birth != null) 'date_of_birth': date_of_birth,
        if (portfolio_officer_name != null) 'portfolio_officer_name': portfolio_officer_name,
        if (requested_amount != null) 'requested_amount': requested_amount,
        if (desired_loan_term != null) 'desired_loan_term': desired_loan_term,
        if (product_type != null) 'product_type': product_type,
        if (requested_disbursement_date != null) 'requested_disbursement_date': requested_disbursement_date,
        if (loan_purposes != null) 'loan_purposes': loan_purposes,
        if (purpose_details != null) 'purpose_details': purpose_details,
        if (guarantor_name != null) 'guarantor_name': guarantor_name,
        if (guarantor_phone != null) 'guarantor_phone': guarantor_phone,
      };

  static ApplicationDto fromJson(Map<String, dynamic> json) => ApplicationDto(
        id_card_type: json['id_card_type'] as String?,
        id_number: json['id_number'] as String?,
        full_name_latin: json['full_name_latin'] as String?,
        phone: json['phone'] as String?,
        date_of_birth: json['date_of_birth'] as String?,
        portfolio_officer_name: json['portfolio_officer_name'] as String?,
        requested_amount: (json['requested_amount'] is num)
            ? (json['requested_amount'] as num).toDouble()
            : (json['requested_amount'] is String)
                ? double.tryParse(json['requested_amount'])
                : null,
        desired_loan_term: json['desired_loan_term'] is int
            ? json['desired_loan_term'] as int
            : int.tryParse('${json['desired_loan_term']}'),
        product_type: json['product_type'] as String?,
        requested_disbursement_date: json['requested_disbursement_date'] as String?,
        loan_purposes: (json['loan_purposes'] as List?)?.map((e) => '$e').toList(),
        purpose_details: json['purpose_details'] as String?,
        guarantor_name: json['guarantor_name'] as String?,
        guarantor_phone: json['guarantor_phone'] as String?,
      );
}