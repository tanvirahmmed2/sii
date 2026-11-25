import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Student Registration Form Fields | Staff Panel',
  description: `Customize fields, document requirements, and custom inputs for student registration at ${SCHOOL_NAME}.`,
};

export default function StaffStudentFormFieldsLayout({ children }: any) {
  return <>{children}</>;
}
