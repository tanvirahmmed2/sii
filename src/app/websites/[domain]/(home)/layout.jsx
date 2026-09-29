import Footer from '@/component/bars/Footer'
import Navbar from '@/component/bars/Navbar'
import Sidebar from '@/component/bars/Sidebar'
import React from 'react'

const HomeLayout = ({children}) => {
  return (
    <div className='relative min-h-screen flex flex-col justify-between overflow-x-hidden bg-slate-50/50 text-slate-800'>
      <Navbar/>
      <Sidebar/>
      <main className='w-full flex-1 flex flex-col'>
        {children}
      </main>
      <Footer/>
    </div>
  )
}

export default HomeLayout