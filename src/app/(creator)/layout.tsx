import { SITE_NAME } from 'src/lib/database/secret';
export const metadata: any = {
    title: `Creator Studio | ${SITE_NAME}`,
    description: `Creator portal and website builder on ${SITE_NAME}.`,
};
export default function CreatorAccessRootLayout({ children }: any) {
    return (<div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {children}
    </div>);
}
