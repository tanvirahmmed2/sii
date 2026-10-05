import React from 'react'

const Main = () => {
    return (
        <div className='w-full flex h-180 overflow-hidden flex-col items-center justify-center relative'>
            <video
                autoPlay
                loop
                muted
                playsInline
                suppressHydrationWarning
                className="absolute inset-0 w-full h-full object-cover blur-[1px] z-0 scale-110 select-none pointer-events-none"
            >
                <source src="/hero_video.mp4" type="video/mp4" />
            </video>
            <div className='relative z-10 text-center px-4 max-w-5xl mx-auto'>
                <h1 className='text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight drop-shadow-md'>
                    World&apos;s #no 1 web solution for LMS management system
                </h1>
            </div>
        </div>
    )
}

export default Main