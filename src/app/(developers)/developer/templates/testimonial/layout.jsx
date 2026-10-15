import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Testimonial Templates | Developer Portal | ${SITE_NAME}`,
  description: `Create verified student testimonial and character certificate templates on ${SITE_NAME}.`,
};

export default function DeveloperTemplateTestimonialLayout({ children }) {
  return <>{children}</>;
}
