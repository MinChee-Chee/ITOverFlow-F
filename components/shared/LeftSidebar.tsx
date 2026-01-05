"use client"

import { sidebarLinks } from '@/constants';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { SignedOut } from '@clerk/nextjs';
import { useEffect, useState, useMemo } from 'react';

const LeftSidebar = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const stableSidebarLinks = useMemo(() => sidebarLinks, []);
  
  // Compute active states - always return false on server to match initial client render
  const activeStates = useMemo(() => {
    const states = new Map<string, boolean>();
    if (!mounted || !pathname) {
      // On server or before mount, all routes are inactive
      stableSidebarLinks.forEach((item) => {
        states.set(item.route, false);
      });
      return states;
    }
    
    // After mount, compute actual active states
    stableSidebarLinks.forEach((item) => {
      let isActive = false;
      if (item.route === '/' && pathname === '/') {
        isActive = true;
      } else if (item.route.length > 1) {
        isActive = pathname.includes(item.route) || pathname === item.route;
      }
      states.set(item.route, isActive);
    });
    return states;
  }, [mounted, pathname, stableSidebarLinks]);
  
  return (
    <section 
      className="background-light900_dark200 light-border custom-scrollbar sticky left-0 top-0 flex h-screen flex-col justify-between overflow-y-auto border-r p-6 pt-36 shadow-light-300 dark:shadow-none max-sm:hidden lg:w-[266px]"
      suppressHydrationWarning
    >
      <div className="flex flex-1 flex-col gap-6">
        {stableSidebarLinks.map((item) => {
          const isActive = activeStates.get(item.route) || false;
          const baseClasses = "flex items-center justify-start gap-4 bg-transparent p-4";
          const linkClassName = isActive
            ? `primary-gradient rounded-lg text-light-900 ${baseClasses}`
            : `text-dark300_light900 ${baseClasses}`;
          
          return (
            <Link
              href={item.route}
              key={item.route}
              className={linkClassName}
              suppressHydrationWarning
            >
              <Image 
                src={item.imgURL}
                alt={item.label}
                width={20}
                height={20}
                className={isActive ? "" : "invert-colors"}
                suppressHydrationWarning
              />
              <p className={`${isActive ? 'base-bold' : 'base-medium'} max-lg:hidden`} suppressHydrationWarning>
                {item.label}
              </p>
            </Link>
          );
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
                    suppressHydrationWarning
                  /> 
                  <span className="primary-text-gradient max-lg:hidden" suppressHydrationWarning>Log In</span>
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
                    suppressHydrationWarning
                  /> 
                  <span className="max-lg:hidden" suppressHydrationWarning>Sign up</span>
                </Button>
              </Link>
            </div>
          </SignedOut>
        )}
      </div>
    </section>
  );
};

export default LeftSidebar;