import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Admission Intake Results',
    description: `Official published intake merit results and candidate selection status at ${SCHOOL_NAME}.`,
};
export default function AdmissionResultsLayout({ children }: any) {
    return <>{children}</>;
}
