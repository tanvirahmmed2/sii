import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Officer Identity Card',
  description: `View and download your official campus officer identity credentials at ${SCHOOL_NAME}.`,
};

export default function OfficerIdCardLayout({ children }: any) {
  return <>{children}</>;
}
