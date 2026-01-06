"use client"

import { sidebarLinks } from '@/constants';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { SignedOut } from '@clerk/nextjs';
import { useEffect, useState, useMemo } from 'react';

const LeftSidebar = () => {
  const [mounted, setMounted] = useState(false);
  const [currentPathname, setCurrentPathname] = useState<string | null>(null);
  
  // Use usePathname hook - but we'll only use its value after mount
  // This prevents hydration mismatches by ensuring server and client render identically
  const pathname = usePathname();
  
  useEffect(() => {
    // Only set pathname and mounted state after component mounts on client
    // This ensures server render matches initial client render
    setMounted(true);
    setCurrentPathname(pathname);
  }, [pathname]);
  
  const stableSidebarLinks = useMemo(() => sidebarLinks, []);
  
  // Compute active states - only use pathname after mount to prevent hydration mismatch
  // This useMemo ensures all states are false on server and initial client render
  const activeStates = useMemo(() => {
    // On server or before mount: return all false states
    if (!mounted || !currentPathname) {
      return new Map(stableSidebarLinks.map(item => [item.route, false]));
    }
    
    // After mount: compute actual active states
    const states = new Map<string, boolean>();
    stableSidebarLinks.forEach((item) => {
      let isActive = false;
      if (item.route === '/' && currentPathname === '/') {
        isActive = true;
      } else if (item.route.length > 1) {
        isActive = currentPathname === item.route || currentPathname.startsWith(item.route + '/');
      }
      states.set(item.route, isActive);
    });
    return states;
  }, [mounted, currentPathname, stableSidebarLinks]);
  
  // Always render the section to prevent hydration mismatch
  // The max-sm:hidden class will handle hiding on small screens via CSS
  return (
    <section 
      className="background-light900_dark200 light-border custom-scrollbar sticky left-0 top-0 flex h-screen flex-col justify-between overflow-y-auto border-r p-6 pt-36 shadow-light-300 dark:shadow-none max-sm:hidden lg:w-[266px]"
      suppressHydrationWarning
    >
      <div className="flex flex-1 flex-col gap-6">
        {stableSidebarLinks.map((item) => {
          // CRITICAL: isActive must be false on server and initial client render
          // Only compute active state after mount to prevent hydration mismatch
          // This ensures server HTML matches client HTML exactly
          const isActive = mounted && currentPathname 
            ? (activeStates.get(item.route) || false) 
            : false;
          
          // Pre-compute all classNames to ensure consistent rendering
          // These values are identical on server and initial client render
          const baseClasses = "flex items-center justify-start gap-4 bg-transparent p-4";
          const linkClassName = isActive
            ? `primary-gradient rounded-lg text-light-900 ${baseClasses}`
            : `text-dark300_light900 ${baseClasses}`;
          
          const imageClassName = isActive ? "" : "invert-colors";
          const textClassName = isActive ? 'base-bold' : 'base-medium';
          
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
                className={imageClassName}
                suppressHydrationWarning
              />
              <p className={`${textClassName} max-lg:hidden`} suppressHydrationWarning>
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>

      <div>
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
  );
};

export default LeftSidebar;