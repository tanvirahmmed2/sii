import Footer from 'src/component/website/bars/Footer';
import Navbar from 'src/component/website/bars/Navbar';
import Sidebar from 'src/component/website/bars/Sidebar';
import CampusHomeWrapper from 'src/component/website/CampusHomeWrapper';
import React from 'react';
import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Campus Homepage',
  description: `Official campus portal and homepage for ${SCHOOL_NAME}. Explore academic programs, admissions, notices, campus facilities, and departments.`,
};

const HomeLayout = ({ children }: any) => {
  return (
    <CampusHomeWrapper>
      <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
        <Navbar />
        <Sidebar />
        <main className="w-full flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
      </div>
    </CampusHomeWrapper>
  );
};

export default HomeLayout;
