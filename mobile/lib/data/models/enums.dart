class IDCardTypeOption {
  final String value;
  final String label;
  final String? labelKhmer;

  const IDCardTypeOption({required this.value, required this.label, this.labelKhmer});

  factory IDCardTypeOption.fromJson(Map<String, dynamic> json) => IDCardTypeOption(
        value: json['value'] ?? '',
        label: json['label'] ?? '',
        labelKhmer: json['label_khmer'] as String?,
      );
}

class ProductTypeOption {
  final String value;
  final String label;

  const ProductTypeOption({required this.value, required this.label});

  factory ProductTypeOption.fromJson(Map<String, dynamic> json) => ProductTypeOption(
        value: json['value'] ?? '',
        label: json['label'] ?? '',
      );
}