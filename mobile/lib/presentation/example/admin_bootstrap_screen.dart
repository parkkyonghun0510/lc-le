import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../data/models/enums.dart';
import '../getx/application_controller.dart';
import 'admin_bootstrap_service.dart';

class AdminBootstrapScreen extends StatefulWidget {
  const AdminBootstrapScreen({super.key});

  @override
  State<AdminBootstrapScreen> createState() => _AdminBootstrapScreenState();
}

class _AdminBootstrapScreenState extends State<AdminBootstrapScreen> {
  late final AdminBootstrapService service;
  late final ApplicationController controller;

  @override
  void initState() {
    super.initState();
    service = AdminBootstrapService();
    controller = service.controller;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      service.initializeAdmin();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Bootstrap')), 
      body: Obx(() {
        if (controller.loading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        final error = controller.error?.value ?? '';
        if (error.isNotEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error, color: Colors.red),
                const SizedBox(height: 8),
                Text('Error: $error'),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () => service.initializeAdmin(),
                  child: const Text('Retry'),
                )
              ],
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.all(16),
          child: ListView(
            children: [
              const Text('ID Card Types', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...controller.idCardTypes.map(_tileForIdCardType),
              const Divider(height: 32),
              const Text('Product Types', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...controller.productTypes.map(_tileForProductType),
            ],
          ),
        );
      }),
    );
  }

  Widget _tileForIdCardType(IDCardTypeOption o) {
    final subtitle = o.labelKhmer != null && o.labelKhmer!.isNotEmpty ? 'Khmer: ${o.labelKhmer}' : null;
    return ListTile(
      title: Text(o.label),
      subtitle: subtitle != null ? Text(subtitle) : null,
      trailing: Text(o.value, style: const TextStyle(color: Colors.grey)),
    );
  }

  Widget _tileForProductType(ProductTypeOption o) {
    return ListTile(
      title: Text(o.label),
      trailing: Text(o.value, style: const TextStyle(color: Colors.grey)),
    );
  }
}