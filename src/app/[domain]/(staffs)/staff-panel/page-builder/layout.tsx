import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Website Page Builder | Staff Panel',
  description: `Visual drag-and-drop website page builder to customize campus homepage and content for ${SCHOOL_NAME}.`,
};

export default function StaffPageBuilderLayout({ children }: any) {
  return <>{children}</>;
}
