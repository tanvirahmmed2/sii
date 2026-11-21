import React from 'react';
import { redirect } from 'next/navigation';
import { isOfficer } from "src/lib/middleware/officer";
import OfficerShell from 'src/component/website/bars/officer/OfficerShell';
export const metadata: any = {
    title: 'Officer Workstation | Campus Portal',
    description: 'Campus operations and administrative module management workstation for officers.',
};
export const dynamic = 'force-dynamic';
export default async function OfficerLayout({ children, params }: any) {
    const resolvedParams = await params;
    const domain = resolvedParams?.domain;
    const authenticated = await isOfficer();
    if (!authenticated) {
        redirect(domain ? `/${domain}/auth/access/officer` : '/auth/access/officer');
    }
    return <OfficerShell>{children}</OfficerShell>;
}
