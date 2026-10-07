import { Suspense } from 'react';
import AdminLoginForm from 'src/component/marketing/developer/forms/AdminLoginForm';
import { SITE_NAME } from 'src/lib/database/secret';
import LoadingScreen from 'src/component/common/LoadingScreen';

export const metadata = {
  title: `Developer Login | ${SITE_NAME}`,
  description: `Restricted administrative gateway for ${SITE_NAME} operators and developers.`,
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen={true} label="Loading developer login..." />}>
      <AdminLoginForm />
    </Suspense>
  );
}
