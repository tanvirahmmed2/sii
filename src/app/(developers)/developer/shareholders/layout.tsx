import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shareholders & Equity | Developer Console',
  description: 'Manage corporate shareholders, share percentages, dividend distribution, and linked withdrawals.',
};

export default function ShareholdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
