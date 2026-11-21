import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'Admission',
    description: `Admission guidelines, requirements, fees, and procedures for enrolling at ${SCHOOL_NAME}.`,
};
export default function AdmissionLayout({ children }: any) {
    return <>{children}</>;
}
