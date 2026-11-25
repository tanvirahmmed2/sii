import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Hostel & Residential Fee Payment',
  description: `Pay hostel accommodation, meal plans, and residential charges online for ${SCHOOL_NAME}.`,
};

export default function ResidentialFeesPayLayout({ children }: any) {
  return <>{children}</>;
}
