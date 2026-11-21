import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Alumni',
    description: `Explore Alumni page at ${SCHOOL_NAME}.`,
};
export default function AlumniLayout({ children }: any) {
    return <>{children}</>;
}
