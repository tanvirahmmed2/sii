import About from '@/component/website/pages/home/About'
import Admission from '@/component/website/pages/home/Admission'
import Events from '@/component/website/pages/home/Events'
import Hero from '@/component/website/pages/home/Hero'
import Life from '@/component/website/pages/home/Life'
import News from '@/component/website/pages/home/News'
import Notices from '@/component/website/pages/home/Notices'
import Recognition from '@/component/website/pages/home/Recognition'
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