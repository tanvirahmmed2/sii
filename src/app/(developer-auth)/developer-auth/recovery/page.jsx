import AdminRecoveryForm from 'src/component/marketing/developer/forms/AdminRecoveryForm';
import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Password Recovery | ${SITE_NAME}`,
  description: `Reset developer access credentials for ${SITE_NAME}.`,
};

export default function AdminRecoveryPage() {
  return <AdminRecoveryForm />;
}
