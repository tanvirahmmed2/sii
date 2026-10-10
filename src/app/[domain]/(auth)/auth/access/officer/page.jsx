import { redirect } from 'next/navigation';

export default function OfficerRedirect() {
  redirect('/auth/access/officer/login');
}
