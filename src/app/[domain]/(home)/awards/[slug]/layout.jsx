import { SCHOOL_NAME } from 'src/lib/database/secret';

export async function generateMetadata({ params: paramsPromise }) {
  const params = await paramsPromise;
  const slug = params?.slug || 'Citation';
  const cleanTitle = String(slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${cleanTitle} | Institutional Honors & Awards`,
    description: `Official institutional award details, jury citation, and conferral credentials for ${SCHOOL_NAME}.`,
  };
}

export default function AwardDetailLayout({ children }) {
  return <>{children}</>;
}
