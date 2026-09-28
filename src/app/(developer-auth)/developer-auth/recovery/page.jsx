import AdminRecoveryForm from '@/components/developer/forms/AdminRecoveryForm';

export const metadata = {
  title: 'Admin Password Recovery | PortfolioCraft SaaS',
  description: 'Generate security recovery token and reset super admin password.',
};

export default function AdminRecoveryPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <AdminRecoveryForm />
    </div>
  );
}
