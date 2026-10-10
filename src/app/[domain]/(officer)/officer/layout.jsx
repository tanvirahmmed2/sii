import React from 'react';
import { redirect } from 'next/navigation';
import { isOfficer } from 'src/lib/middleware/officer.js';
import OfficerShell from 'src/component/website/bars/officer/OfficerShell';

export const metadata = {
  title: 'Officer Workstation | Campus Portal',
  description: 'Campus operations and administrative module management workstation for officers.',
};

export const dynamic = 'force-dynamic';

export default async function OfficerLayout({ children }) {
  const authenticated = await isOfficer();

  if (!authenticated) {
    redirect('/auth/access/officer/login');
  }

  return <OfficerShell>{children}</OfficerShell>;
}
