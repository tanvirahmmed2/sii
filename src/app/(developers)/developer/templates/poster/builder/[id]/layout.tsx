import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Marketing Poster Studio | Developer Portal | ${SITE_NAME}`,
  description: `Design promotional banners, campus flyers, and digital marketing materials on ${SITE_NAME}.`,
};

export default function DeveloperPosterStudioLayout({ children }: any) {
  return <>{children}</>;
}
