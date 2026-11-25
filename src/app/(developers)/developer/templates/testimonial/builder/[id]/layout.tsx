import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Testimonial Template Studio | Developer Portal | ${SITE_NAME}`,
  description: `Visual template studio for student character testimonials and certificates on ${SITE_NAME}.`,
};

export default function DeveloperTestimonialStudioLayout({ children }: any) {
  return <>{children}</>;
}
