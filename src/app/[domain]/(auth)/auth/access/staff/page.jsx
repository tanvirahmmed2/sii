import { redirect } from 'next/navigation';

export default function StaffRedirect() {
  redirect('/auth/access/staff/login');
}
