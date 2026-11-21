import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Teachers - Id',
    description: `Explore Teachers - Id page at ${SCHOOL_NAME}.`,
};
export default function TeachersIdLayout({ children }: any) {
    return <>{children}</>;
}
