import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Admission Fee Payment',
  description: `Pay application and enrollment fees securely online for ${SCHOOL_NAME}.`,
};

export default function AdmissionFeesPayLayout({ children }: any) {
  return <>{children}</>;
}
