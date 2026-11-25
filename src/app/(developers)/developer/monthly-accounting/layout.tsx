import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monthly Accounting & Profit Distribution | Developer Console',
  description: 'Segregated monthly financial statements for sales, investments, expenses, and shareholder profit distribution or reinvestment.',
};

export default function MonthlyAccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
