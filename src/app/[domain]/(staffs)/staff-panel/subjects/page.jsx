import { redirect } from 'next/navigation';

export default function AdminSubjectsRedirect() {
  redirect('/staff-panel/subjects/new');
}
