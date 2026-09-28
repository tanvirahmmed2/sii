import About from '@/components/home/pages/About'
import Ecommerce from '@/components/home/pages/E-commerce'
import Restaurant from '@/components/home/pages/Restaurant'
import Hero from '@/components/home/pages/Hero'
import LearnMore from '@/components/home/pages/LearnMore'
import Portfolio from '@/components/home/pages/Portfolio'
import Reviews from '@/components/home/pages/Reviews'
import SystemManagement from '@/components/home/pages/SystemManagement'
import Themes from '@/components/home/pages/Themes'
import React from 'react'

const page = () => {
  return (
    <div className='w-full flex flex-col'>
      <Hero/>
      <About/>
      <LearnMore/>
      <Ecommerce/>
      <Restaurant/>
      <Portfolio/>
      <SystemManagement/>
      <Themes/>
      <Reviews/>
    </div>
  )
}

export default page