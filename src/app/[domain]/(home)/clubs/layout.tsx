import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Clubs',
    description: `Discover club activities, student organizations, and extra-curricular clubs at ${SCHOOL_NAME}.`,
};
export default function ClubsLayout({ children }: any) {
    return <>{children}</>;
}
