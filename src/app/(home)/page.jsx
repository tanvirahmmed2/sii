import About from '@/component/marketing/home/pages/About'
import Hero from '@/component/marketing/home/pages/Hero'
import LearnMore from '@/component/marketing/home/pages/LearnMore'
import Reviews from '@/component/marketing/home/pages/Reviews'
import Partners from '@/component/marketing/home/pages/Partners'
import React from 'react'
import Main from '@/component/marketing/home/pages/Main'

const page = () => {
  return (
    <div className='w-full flex flex-col'>
      <Main/>
      <Hero/>
      <About/>
      <LearnMore/>
      <Partners/>
      <Reviews/>
    </div>
  )
}

export default page