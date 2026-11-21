import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Facilities - Classrooms',
    description: `Explore classrooms, lab facilities, and hostel accommodations at ${SCHOOL_NAME}.`,
};
export default function FacilitiesClassroomsLayout({ children }: any) {
    return <>{children}</>;
}
