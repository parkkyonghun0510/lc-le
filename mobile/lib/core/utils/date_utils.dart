class DateValidators {
  static bool isValidYyyyMmDd(String value) {
    try {
      DateTime.parse(value);
      return true;
    } catch (_) {
      return false;
    }
  }

  static String? validateDisbursementDate(String? value) {
    if (value == null || value.isEmpty) return 'Disbursement date is required';
    try {
      final disb = DateTime.parse(value);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      if (disb.isBefore(today)) return 'Disbursement date cannot be in the past';
      final oneYear = DateTime(now.year + 1, now.month, now.day);
      if (disb.isAfter(oneYear)) return 'Disbursement date cannot be more than 1 year in the future';
      return null;
    } catch (_) {
      return 'Invalid disbursement date format (expected YYYY-MM-DD)';
    }
  }
}