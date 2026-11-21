import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Teacher - Materials',
    description: `Explore Teacher - Materials page at ${SCHOOL_NAME}.`,
};
export default function MaterialsLayout({ children }: any) {
    return <>{children}</>;
}
