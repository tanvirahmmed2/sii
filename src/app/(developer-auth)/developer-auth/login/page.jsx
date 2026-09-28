import AdminLoginForm from '@/components/developer/forms/AdminLoginForm';

export const metadata = {
  title: 'Super Admin Login | PortfolioCraft SaaS',
  description: 'Restricted administrative gateway for SaaS operators.',
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <AdminLoginForm />
    </div>
  );
}
