import { redirect } from 'next/navigation';
import React from 'react';

const AdminExamsPage = () => {
  return redirect('/admin/exams/current');
};

export default AdminExamsPage;
