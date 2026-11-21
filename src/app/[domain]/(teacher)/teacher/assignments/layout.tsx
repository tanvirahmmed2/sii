import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Teacher - Assignments',
    description: `Explore Teacher - Assignments page at ${SCHOOL_NAME}.`,
};
export default function AssignmentsLayout({ children }: any) {
    return <>{children}</>;
}
