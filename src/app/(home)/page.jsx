import About from '@/components/home/pages/About'
import Hero from '@/components/home/pages/Hero'
import LearnMore from '@/components/home/pages/LearnMore'
import Reviews from '@/components/home/pages/Reviews'
import Themes from '@/components/home/pages/Themes'
import Partners from '@/components/home/pages/Partners'
import React from 'react'

const page = () => {
  return (
    <div className='w-full flex flex-col'>
      <Hero/>
      <Partners/>
      <About/>
      <LearnMore/>
      <Themes/>
      <Reviews/>
    </div>
  )
}

export default page