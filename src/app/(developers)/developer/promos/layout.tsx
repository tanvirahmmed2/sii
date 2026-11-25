import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Promos & Discount Coupons | Developer Portal | ${SITE_NAME}`,
  description: `Manage promotional codes, percentage discounts, campaign durations, and redemption tracking on ${SITE_NAME}.`,
};

export default function DeveloperPromosLayout({ children }: any) {
  return <>{children}</>;
}
