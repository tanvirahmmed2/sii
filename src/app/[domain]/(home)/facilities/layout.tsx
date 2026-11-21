import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Facilities',
    description: `Explore classrooms, lab facilities, and hostel accommodations at ${SCHOOL_NAME}.`,
};
export default function FacilitiesLayout({ children }: any) {
    return <>{children}</>;
}
