import { redirect } from 'next/navigation';
import { getCreatorSession } from 'src/lib/middleware/creator';
import WorkspaceClientResolver from './WorkspaceClientResolver';

export const dynamic = 'force-dynamic';

export default async function WorkspaceRootPage() {
  const sessionCreator = await getCreatorSession();

  if (sessionCreator && sessionCreator.id) {
    redirect(`/creator/${sessionCreator.id}/workspace`);
  }

  // Fallback to client resolver in case session is stored in localStorage or client cookies
  return <WorkspaceClientResolver />;
}
