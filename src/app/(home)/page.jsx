import About from '@/components/home/pages/About'
import Hero from '@/components/home/pages/Hero'
import LearnMore from '@/components/home/pages/LearnMore'
import Reviews from '@/components/home/pages/Reviews'
import Partners from '@/components/home/pages/Partners'
import React from 'react'
import Main from '@/component/home/pages/Main'

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