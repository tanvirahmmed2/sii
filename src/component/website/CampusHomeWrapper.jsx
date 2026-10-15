'use client';

import React from 'react';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import CampusMaintenanceScreen from './CampusMaintenanceScreen';

export default function CampusHomeWrapper({ children }) {
  const { website } = useTenantWebsite();

  if (website?.is_maintenance_mode) {
    return <CampusMaintenanceScreen />;
  }

  return <>{children}</>;
}
