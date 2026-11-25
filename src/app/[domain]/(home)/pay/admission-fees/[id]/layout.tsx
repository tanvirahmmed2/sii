import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Admission Invoice Payment',
  description: `Complete online payment for admission invoice and download receipt for ${SCHOOL_NAME}.`,
};

export default function AdmissionInvoicePayLayout({ children }: any) {
  return <>{children}</>;
}
