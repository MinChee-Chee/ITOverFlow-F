"use client"

import { sidebarLinks } from '@/constants';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { SignedOut, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const LeftSidebar = () => {
  const {userId, isLoaded} = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Ensure component only renders after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Always render the section to maintain consistent structure
  return (
    <section 
      className="background-light900_dark200 light-border custom-scrollbar sticky left-0 top-0 flex h-screen flex-col justify-between overflow-y-auto border-r p-6 pt-36 shadow-light-300 dark:shadow-none max-sm:hidden lg:w-[266px]"
      suppressHydrationWarning
    >
      <div className="flex flex-1 flex-col gap-6">
        {sidebarLinks.map((item) => {
          const isActive = (pathname.includes(item.route) && item.route.length > 1) || pathname === item.route;

          // Profile and Pricing links should only show when user is logged in
          if(item.route === '/profile' || item.route === '/pricing') {
            // Only show these links if auth is loaded and user is authenticated
            // During SSR, we'll render null to maintain consistency
            if(!mounted || !isLoaded || !userId) {
              return null;
            }
            
            // If user is logged in, compute the href
            let href = item.route;
            if(item.route === '/profile') {
              href = `/profile/${userId}`;
            }
            
            return (
              <Link
                href={href}
                key={item.label}
                className={`${
                  isActive
                    ? "primary-gradient rounded-lg text-light-900"
                    : "text-dark300_light900"
                }  flex items-center justify-start gap-4 bg-transparent p-4`}
              >
                <Image 
                  src={item.imgURL}
                  alt={item.label}
                  width={20}
                  height={20}
                  className={`${isActive ? "" : "invert-colors"}`}
                />
                <p className={`${isActive ? 'base-bold' : 'base-medium'} max-lg:hidden`}>{item.label}</p>
              </Link>
            );
          }

          // For all other links, render normally
          return (
              <Link
              href={item.route}
              key={item.label}
              className={`${
                isActive
                  ? "primary-gradient rounded-lg text-light-900"
                  : "text-dark300_light900"
              }  flex items-center justify-start gap-4 bg-transparent p-4`}
            >
              <Image 
                src={item.imgURL}
                alt={item.label}
                width={20}
                height={20}
                className={`${isActive ? "" : "invert-colors"}`}
              />
              <p className={`${isActive ? 'base-bold' : 'base-medium'} max-lg:hidden`}>{item.label}</p>
            </Link>
          )
        })}
      </div>

      <div suppressHydrationWarning>
        {mounted && (
          <SignedOut>
            <div className="flex flex-col gap-3">
                <Link href="/sign-in">
                  <Button className="small-medium btn-secondary min-h-[41px] w-full rounded-lg px-4 py-3 shadow-none">
                    <Image 
                      src="/assets/icons/account.svg"
                      alt="login"
                      width={20}
                      height={20}
                      className="invert-colors lg:hidden"
                    /> 
                    <span className="primary-text-gradient max-lg:hidden">Log In</span>
                  </Button>
                </Link>

            
                <Link href="/sign-up">
                  <Button className='small-medium light-border-2 btn-tertiary text-dark400_light900 min-h-[41px] w-full rounded-lg border px-4 py-3 shadow-none'>
                  <Image 
                      src="/assets/icons/sign-up.svg"
                      alt="sign up"
                      width={20}
                      height={20}
                      className="invert-colors lg:hidden"
                    /> 
                    <span className="max-lg:hidden">Sign up</span>
                  </Button>
                </Link>
            </div>
          </SignedOut>
        )}
      </div>
    </section>
  )
}

export default LeftSidebar