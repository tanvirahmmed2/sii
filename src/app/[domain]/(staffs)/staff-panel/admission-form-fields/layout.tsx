import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Admission Form Customizer | Staff Panel',
  description: `Customize dynamic admission application form fields, requirements, and document uploads at ${SCHOOL_NAME}.`,
};

export default function StaffAdmissionFormFieldsLayout({ children }: any) {
  return <>{children}</>;
}
