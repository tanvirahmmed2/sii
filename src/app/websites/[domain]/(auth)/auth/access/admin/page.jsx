import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/auth/access/admin/login');
}
