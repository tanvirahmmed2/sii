import { Suspense } from 'react';
import AdminVerifyForm from 'src/component/marketing/developer/forms/AdminVerifyForm';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Developer Account Verification | ${SITE_NAME}`,
  description: `Verify administrator access code for ${SITE_NAME}.`,
};

export default function AdminVerifyPage() {
  return (
    <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
      <AdminVerifyForm />
    </Suspense>
  );
}
