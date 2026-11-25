import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Expenses & Disbursement Transactions | Developer Console',
  description: 'Manage custom company expenses, salary expense auto-tracking, and disbursement transactions.',
};

export default function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
