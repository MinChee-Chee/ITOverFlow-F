import { SignedIn, UserButton } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import React, { Suspense } from 'react'
import Theme from './Theme'
import MobileNav from './MobileNav'
import GlobalSearch from '../search/GlobalSearch'
import MenubarComponent from '../Menubar'
import WarningNotification from '../WarningNotification'
const Navbar = () => {
  return (
    <nav className='flex-between background-light900_dark200 
    fixed z-50 w-full gap-5 p-6 shadow-light-300 
    dark:shadow-none sm:px-12 '>
        <Link href='/' className='flex items-center gap-1'>
            <Image
                src="/assets/images/site-logo.svg"
                width={25}
                height={25}
                alt='IT Overflow'    
            />

            <p
            className='h2-bold font-spaceGrotesk text-dark-100 
            dark:text-light-900 max-sm:hidden'>IT<span
            className='text-primary-500'>OverFlow</span></p>
        </Link>

        <Suspense fallback={<div className="flex-1 max-w-[600px] h-[40px] animate-pulse bg-light-800 dark:bg-dark-300 rounded-md" />}>
          <GlobalSearch/>
        </Suspense>

        <div className='flex-between gap-5'>
            <div className="hidden sm:flex">
              <MenubarComponent/>
            </div>
            <Theme/>
            
            <SignedIn>
              <WarningNotification />
              <UserButton afterSwitchSessionUrl="/"
              appearance={{
                  elements: {
                      avatarBox:'h-10 w-10'
                  },
                  variables: {
                      colorPrimary: '#ff7000'
                  }
              }}
              />
            </SignedIn>

            <MobileNav/>
        </div>
    </nav>
  )
}

export default Navbar