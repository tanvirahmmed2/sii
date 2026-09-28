import { redirect } from 'next/navigation';

export default function TeacherRedirect() {
  redirect('/auth/access/teacher/login');
}
