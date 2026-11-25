import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investments & Cap Table Capital | Developer Console',
  description: 'Manage capital injections, funding rounds, share certificates, and shareholder divestments.',
};

export default function InvestmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
