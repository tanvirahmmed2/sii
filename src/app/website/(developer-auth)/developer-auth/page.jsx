import { redirect } from 'next/navigation';

export default function AdminAccessGatewayPage() {
  redirect('/developer-auth/login');
}
