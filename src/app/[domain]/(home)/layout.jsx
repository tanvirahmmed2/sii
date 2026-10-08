import Footer from 'src/component/website/bars/Footer'
import Navbar from 'src/component/website/bars/Navbar'
import Sidebar from 'src/component/website/bars/Sidebar'
import React from 'react'

const HomeLayout = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar />
      <Sidebar />
      <main className="w-full flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default HomeLayout;