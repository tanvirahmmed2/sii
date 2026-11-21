import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Clubs - Slug',
    description: `Explore Clubs - Slug page at ${SCHOOL_NAME}.`,
};
export default function ClubsSlugLayout({ children }: any) {
    return <>{children}</>;
}
