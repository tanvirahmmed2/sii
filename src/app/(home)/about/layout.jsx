import { SITE_NAME } from '@/lib/db/secret'
import React from 'react'

export const metadata={
    title: `About | ${SITE_NAME}`,
    description:`About site of ${SITE_NAME}`
}

const layout = ({children}) => {
  return <>{children}</>
}

export default layout