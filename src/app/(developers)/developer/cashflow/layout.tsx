import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Cashflow & Financial Ledgers | Developer Portal | ${SITE_NAME}`,
  description: `Monitor cashflow transactions, financial revenues, and system ledgers on ${SITE_NAME}.`,
};

export default function DeveloperCashflowLayout({ children }: any) {
  return <>{children}</>;
}
