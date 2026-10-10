'use client';

import React from 'react';
import OfficersManagementWorkstation from 'src/component/website/admin/OfficersManagementWorkstation';

export default function ManagementOthersPage() {
  return (
    <OfficersManagementWorkstation
      title="Campus Officers Administration"
      subtitle="Supervise campus officers, manage role permissions mapped from package modules, and dispatch email invitations."
    />
  );
}
