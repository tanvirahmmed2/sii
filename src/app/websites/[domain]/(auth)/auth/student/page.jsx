import { redirect } from 'next/navigation'
import React from 'react'

const page = () => {
  return redirect('/auth/student/login')
}

export default page