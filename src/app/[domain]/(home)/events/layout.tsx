import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Events',
    description: `Explore Events page at ${SCHOOL_NAME}.`,
};
export default function EventsLayout({ children }: any) {
    return <>{children}</>;
}
