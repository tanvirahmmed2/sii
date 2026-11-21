import { SCHOOL_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: 'About',
    description: `Learn about the history, vision, mission, campus, and milestones of ${SCHOOL_NAME}.`,
};
export default function AboutLayout({ children }: any) {
    return <>{children}</>;
}
