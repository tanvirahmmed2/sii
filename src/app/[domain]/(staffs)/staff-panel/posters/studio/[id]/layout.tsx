import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Poster Studio Editor | Staff Panel',
  description: `Edit graphic design posters, campus notices, and visual banners in the studio for ${SCHOOL_NAME}.`,
};

export default function StaffPosterStudioIdLayout({ children }: any) {
  return <>{children}</>;
}
