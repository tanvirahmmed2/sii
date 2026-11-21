import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Teacher - Marks',
    description: `Explore Teacher - Marks page at ${SCHOOL_NAME}.`,
};
export default function MarksLayout({ children }: any) {
    return <>{children}</>;
}
