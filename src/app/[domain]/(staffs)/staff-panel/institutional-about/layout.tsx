import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Institutional Profile & Governance | Staff Panel',
  description: `Configure institutional accreditation, mission, vision, and governance profiles for ${SCHOOL_NAME}.`,
};

export default function StaffInstitutionalAboutLayout({ children }: any) {
  return <>{children}</>;
}
