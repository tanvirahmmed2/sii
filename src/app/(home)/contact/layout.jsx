import { SITE_NAME } from '@/lib/db/secret'
import React from 'react'

export const metadata={
    title: `Contact | ${SITE_NAME}`,
    description:`Contact site of ${SITE_NAME}`
}

const layout = ({children}) => {
  return <>{children}</>
}

export default layout