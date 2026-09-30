import Image from 'next/image'
import React from 'react'

const Main = () => {
    return (
        <div className='w-full flex h-200 overflow-hidden flex-col items-center justify-center relative'>
            <video
                autoPlay
                loop
                muted
                playsInline
                suppressHydrationWarning
                className="absolute inset-0 w-full h-full object-cover z-0 scale-110 select-none pointer-events-none"
            >
                <source src="/hero_video.mp4" type="video/mp4" />
            </video>
            <div>
                <h1></h1>
            </div>
        </div>
    )
}

export default Main