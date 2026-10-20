import About from 'src/component/website/pages/home/About'
import Admission from 'src/component/website/pages/home/Admission'
import Events from 'src/component/website/pages/home/Events'
import Hero from 'src/component/website/pages/home/Hero'
import Life from 'src/component/website/pages/home/Life'
import News from 'src/component/website/pages/home/News'
import Notices from 'src/component/website/pages/home/Notices'
import Awards from 'src/component/website/pages/home/Awards'
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
    <Awards/>
    </>
  )
}

export default Home