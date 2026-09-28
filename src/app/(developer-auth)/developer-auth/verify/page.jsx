import { Suspense } from 'react';
import AdminVerifyForm from '@/components/developer/forms/AdminVerifyForm';

export const metadata = {
  title: 'Admin Account Verification | PortfolioCraft SaaS',
  description: 'Verify administrator access code sent via Brevo email.',
};

export default function AdminVerifyPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-sm text-slate-400">Loading verification portal...</div>}>
        <AdminVerifyForm />
      </Suspense>
    </div>
  );
}
