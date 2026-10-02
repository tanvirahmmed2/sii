import { Suspense } from 'react';
import AdminLoginForm from 'src/component/marketing/developer/forms/AdminLoginForm';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Developer Login | ${SITE_NAME}`,
  description: `Restricted administrative gateway for ${SITE_NAME} operators and developers.`,
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
