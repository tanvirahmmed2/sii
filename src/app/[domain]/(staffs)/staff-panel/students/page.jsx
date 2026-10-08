import { redirect } from 'next/navigation';

export default function AdminStudentsRedirect() {
  redirect('/staff-panel/students/lists');
}
