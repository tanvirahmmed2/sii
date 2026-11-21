import { redirect } from 'next/navigation';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Reset Password | ${SITE_NAME}`,
    description: `Recover your creator account access on ${SITE_NAME}.`,
};
export default async function CreatorRecoveryLayout({ children }: any) {
    const session = await getCreatorSession();
    if (session && session.isActive && session.isVerified) {
        redirect(`/creator/${session.id}`);
    }
    return <>{children}</>;
}
