import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Transfer Certificate Templates | Developer Portal | ${SITE_NAME}`,
  description: `Design formal school transfer certificate (TC) documents and credentials on ${SITE_NAME}.`,
};

export default function DeveloperTemplateTCLayout({ children }) {
  return <>{children}</>;
}
