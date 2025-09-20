'use client';

import React from 'react';
import SystemHealthDashboard from '../../components/monitoring/SystemHealthDashboard';

const MonitoringPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <SystemHealthDashboard />
    </div>
  );
};

export default MonitoringPage;