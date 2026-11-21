import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Collaborations',
    description: `Explore Collaborations page at ${SCHOOL_NAME}.`,
};
export default function CollaborationsLayout({ children }: any) {
    return <>{children}</>;
}
