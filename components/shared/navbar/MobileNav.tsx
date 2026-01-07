"use client"
import React, { useState, useEffect } from 'react'
import {
    Sheet,
    SheetContent,
    SheetClose,
    SheetTrigger,
    SheetTitle,
  } from "@/components/ui/sheet"
import Image from 'next/image'
import Link from 'next/link'
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { sidebarLinks } from '@/constants'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'


const NavContent = () => {
    const pathname = usePathname();
    return (
        <section className='flex flex-col gap-2'>
            {sidebarLinks.map((item) => {
                const isActive= (pathname.includes(item.route) && item.route.length > 1) || pathname === item.route;

                return (
                    <SheetClose asChild key={item.route}>
                    <Link
                    href={item.route}
                    className={`${isActive ? 'primary-gradient rounded-lg text-light-900' : 'text-dark300_light900'} flex items-center justify-start gap-4 bg-transparent p-3 hover:bg-light-800 dark:hover:bg-dark-400 rounded-lg transition-colors`}>
                        <Image
                        src={item.imgURL}
                        alt={item.label}
                        width={20}
                        height={20}
                        className={`${isActive ? "" : "invert-colors" }`}/>
                        <p
                        className={`${isActive ? "base-bold" : "base-medium"}`}>{item.label}</p>
                    </Link>
                </SheetClose>
                )
            })}
        </section>
    )
}

const MobileMenuSection = ({ 
    title, 
    children, 
    isOpen: controlledIsOpen, 
    onToggle 
}: { 
    title: string
    children: React.ReactNode
    isOpen?: boolean
    onToggle?: () => void
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const open = controlledIsOpen !== undefined ? controlledIsOpen : isOpen
    const toggle = onToggle || (() => setIsOpen(!isOpen))

    return (
        <div className="border-b border-light-700 dark:border-dark-400 bg-light-800 dark:bg-dark-400 rounded-lg mb-2">
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between p-3 text-dark300_light900 hover:bg-light-700 dark:hover:bg-dark-300 rounded-lg transition-colors"
            >
                <span className="base-medium font-semibold">{title}</span>
                <ChevronRight 
                    className={`h-4 w-4 transition-transform text-dark-400 dark:text-light-700 ${open ? 'rotate-90' : ''}`}
                />
            </button>
            {open && (
                <div className="pl-4 pb-3 pt-1">
                    {children}
                </div>
            )}
        </div>
    )
}

const MobileMenuItems = () => {
    const { user, isLoaded } = useUser()
    const userId = user?.id
    const pathname = usePathname()
    const [isAdmin, setIsAdmin] = useState(false)
    const [isModerator, setIsModerator] = useState(false)
    const [roleLoading, setRoleLoading] = useState(true)
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (!isLoaded) {
            setRoleLoading(true)
            return
        }

        const checkRoles = async () => {
            try {
                const response = await fetch("/api/auth/check-role")
                if (response.ok) {
                    const data = await response.json()
                    setIsAdmin(data.isAdmin === true)
                    setIsModerator(data.isModerator === true)
                }
            } catch (error) {
                console.error("Error checking roles:", error)
                setIsAdmin(false)
                setIsModerator(false)
            } finally {
                setRoleLoading(false)
            }
        }

        checkRoles()
    }, [isLoaded])

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }

    const MenuLink = ({ href, label, icon }: { href: string, label: string, icon?: string }) => {
        const isActive = pathname === href || (href.length > 1 && pathname.includes(href))
        return (
            <SheetClose asChild>
                <Link
                    href={href}
                    className={`${isActive ? 'text-primary-500' : 'text-dark300_light900'} flex items-center gap-3 p-2 hover:bg-light-800 dark:hover:bg-dark-400 rounded-lg transition-colors`}
                >
                    {icon && (
                        <Image
                            src={icon}
                            alt=""
                            width={16}
                            height={16}
                            className="invert-colors"
                        />
                    )}
                    <span className="small-medium">{label}</span>
                </Link>
            </SheetClose>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            {/* User Menu */}
            <MobileMenuSection
                title="User"
                isOpen={openSections.user}
                onToggle={() => toggleSection('user')}
            >
                <div className="flex flex-col gap-1 pt-2">
                    {!isLoaded ? (
                        <span className="small-medium text-dark-400 dark:text-light-700 p-2">Loading...</span>
                    ) : userId ? (
                        <>
                            <MenuLink href={`/profile/${userId}`} label="Profile" />
                            <MenuLink href="/profile/edit" label="Edit Profile" />
                        </>
                    ) : (
                        <span className="small-medium text-dark-400 dark:text-light-700 p-2">
                            Please sign in to continue!
                        </span>
                    )}
                </div>
            </MobileMenuSection>

            {/* Subscriber Menu - Always visible */}
            <MobileMenuSection
                title="Subscriber"
                isOpen={openSections.subscriber}
                onToggle={() => toggleSection('subscriber')}
            >
                <div className="flex flex-col gap-1 pt-2">
                    <MenuLink href="/chat" label="Chat Groups" />
                    <div className="pl-4 flex flex-col gap-1">
                        <MenuLink href="/chatAI" label="Chat AI Assistant" />
                        <MenuLink href="/chatAI/history" label="Chat AI History" />
                    </div>
                    <div className="pl-4 flex flex-col gap-1">
                        <MenuLink href="/recommendation" label="Recommendations" />
                        <MenuLink href="/recommendation/history" label="Recommendation History" />
                    </div>
                    <MenuLink href="/sandbox" label="Code Sandbox" />
                </div>
            </MobileMenuSection>

            {/* Moderator Menu */}
            {(isModerator || isAdmin) && (
                <MobileMenuSection
                    title="Moderator"
                    isOpen={openSections.moderator}
                    onToggle={() => toggleSection('moderator')}
                >
                    <div className="flex flex-col gap-1 pt-2">
                        {roleLoading ? (
                            <span className="small-medium text-dark-400 dark:text-light-700 p-2">Loading...</span>
                        ) : (
                            <>
                                <MenuLink href="/moderator/dashboard" label="Dashboard" />
                                <MenuLink href="/moderator/reports" label="Content Reports" />
                                <MenuLink href="/moderator" label="Manage Chat Groups" />
                            </>
                        )}
                    </div>
                </MobileMenuSection>
            )}

            {/* Admin Menu */}
            {isAdmin && (
                <MobileMenuSection
                    title="Admin"
                    isOpen={openSections.admin}
                    onToggle={() => toggleSection('admin')}
                >
                    <div className="flex flex-col gap-1 pt-2">
                        {roleLoading ? (
                            <span className="small-medium text-dark-400 dark:text-light-700 p-2">Loading...</span>
                        ) : (
                            <MenuLink href="/admin" label="Admin Dashboard" />
                        )}
                    </div>
                </MobileMenuSection>
            )}
        </div>
    )
}

const MobileNav = () => {
  return (
    <Sheet>
        <SheetTrigger asChild>
            <Image
                src="/assets/icons/hamburger.svg"
                width={35}
                height={35}
                alt='Menu'
                className="invert-colors sm:hidden"
            />
        </SheetTrigger>
            <SheetContent side="left" className="background-light900_dark200 border-none flex flex-col p-4 sm:p-6">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full">
                <Link href='/' className='flex items-center gap-1 mb-4 flex-shrink-0'>
                    <Image
                        src="/assets/images/site-logo.svg"
                        width={25}
                        height={25}
                        alt='IT Overflow'    
                    />

                    <p
                    className='h2-bold text-dark100_light900 font-spaceGrotesk'>IT<span
                    className='text-primary-500'>OverFlow</span></p>
                </Link>
                
                <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                    <div className="space-y-4">
                        {/* Main Navigation Links */}
                        <div>
                            <h3 className="text-sm font-semibold text-dark-400 dark:text-light-700 mb-2 px-2">Navigation</h3>
                            <SheetClose asChild>
                                <NavContent/>
                            </SheetClose>
                        </div>

                        {/* Menu Sections (User, Subscriber, Moderator, Admin) */}
                        <div>
                            <h3 className="text-sm font-semibold text-dark-400 dark:text-light-700 mb-2 px-2">Menu</h3>
                            <MobileMenuItems />
                        </div>
                    </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-light-700 dark:border-dark-400 flex-shrink-0">
                    <SignedOut>
                        <div className='flex flex-col gap-3'>
                            <SheetClose asChild>
                            <Link href="/sign-in">
                            <Button className='small-medium btn-secondary min-h-[41px] w-full rounded-lg px-4 py-3 shadow-none'>
                                <span className='primary-text-gradient'>Log In</span>
                            </Button>
                            </Link>
                            </SheetClose>

                            <SheetClose asChild>
                            <Link href="/sign-up">
                            <Button className='small-medium light-border-2 btn-tertiary text-dark400_light900 min-h-[41px] w-full rounded-lg px-4 py-3 shadow-none'>
                               Sign Up
                            </Button>
                            </Link>
                            </SheetClose>
                        </div>
                    </SignedOut>
                </div>
            </div>
            </SheetContent>
    </Sheet>
  )
}

export default MobileNav