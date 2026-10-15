import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Poster & Banner Templates | Developer Portal | ${SITE_NAME}`,
  description: `Create and publish promotional campus event posters and banner layouts on ${SITE_NAME}.`,
};

export default function DeveloperTemplatePosterLayout({ children }) {
  return <>{children}</>;
}
