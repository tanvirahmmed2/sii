import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Teacher - Salary',
    description: `Explore Teacher - Salary page at ${SCHOOL_NAME}.`,
};
export default function SalaryLayout({ children }: any) {
    return <>{children}</>;
}
