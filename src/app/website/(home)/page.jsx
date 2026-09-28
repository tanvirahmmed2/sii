import About from '@/component/pages/home/About'
import Admission from '@/component/pages/home/Admission'
import Events from '@/component/pages/home/Events'
import Hero from '@/component/pages/home/Hero'
import Life from '@/component/pages/home/Life'
import News from '@/component/pages/home/News'
import Notices from '@/component/pages/home/Notices'
import Recognition from '@/component/pages/home/Recognition'
import AnnouncementPopup from '@/component/helper/AnnouncementPopup'
import React from 'react'

const Home = () => {
  return (
    <>
    <Hero/>
    <About/>
    <Life/>
    <Admission/>
    <Notices/>
    <Events/>
    <News/>
    <AnnouncementPopup/>
    <Recognition/>
    </>
  )
}

export default Home