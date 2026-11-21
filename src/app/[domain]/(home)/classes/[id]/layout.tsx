import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Classes - Id',
    description: `Explore Classes - Id page at ${SCHOOL_NAME}.`,
};
export default function ClassesIdLayout({ children }: any) {
    return <>{children}</>;
}
