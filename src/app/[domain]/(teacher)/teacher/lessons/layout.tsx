import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Teacher - Lessons',
    description: `Explore Teacher - Lessons page at ${SCHOOL_NAME}.`,
};
export default function LessonsLayout({ children }: any) {
    return <>{children}</>;
}
