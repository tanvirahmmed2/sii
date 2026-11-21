import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Teacher - Attendance',
    description: `Explore Teacher - Attendance page at ${SCHOOL_NAME}.`,
};
export default function AttendanceLayout({ children }: any) {
    return <>{children}</>;
}
