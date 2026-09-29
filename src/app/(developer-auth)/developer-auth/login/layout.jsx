import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Staff Login | ${SITE_NAME} Developer Portal`,
  description: `Sign in to access administrative and developer controls on ${SITE_NAME}.`,
};

export default function LoginLayout({ children }) {
  return <>{children}</>;
}
