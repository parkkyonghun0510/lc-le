import 'package:flutter/material.dart';
import 'package:mobile/presentation/example/admin_bootstrap_screen.dart';

void main() {
  runApp(const MobileExampleApp());
}

class MobileExampleApp extends StatelessWidget {
  const MobileExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mobile Example',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      home: const AdminBootstrapScreen(),
    );
  }
}