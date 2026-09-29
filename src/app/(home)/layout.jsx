
import { SITE_NAME } from 'src/lib/database/secret';
import LiveChatPopup from 'src/component/marketing/home/LiveChatPopup';
import HomeNavbar from 'src/component/marketing/home/bar/Navbar';
import Footer from 'src/component/marketing/home/bar/Footer';

export const metadata = {
  title: `${SITE_NAME} - Build Your Identity`,
  description: `Portfolio wesite builder ${SITE_NAME}`,
};

export default function HomeLayout({ children }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative transition-colors duration-200">
      <HomeNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <LiveChatPopup />
    </div>
  );
}
