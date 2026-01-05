
"use client"

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function MenubarComponent() {
  const { user, isLoaded } = useUser()
  const userId = user?.id
  const [isAdmin, setIsAdmin] = useState(false)
  const [isModerator, setIsModerator] = useState(false)
  const [roleLoading, setRoleLoading] = useState(true)

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

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>User</MenubarTrigger>
        <MenubarContent>
          {!isLoaded ? (
            <MenubarItem disabled>Loading...</MenubarItem>
          ) : userId ? (
            <>
              <MenubarItem asChild>
                <Link href={`/profile/${userId}`}>
                  Profile
                </Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/profile/edit">
                  Edit Profile
                </Link>
              </MenubarItem>
            </>
          ) : (
            <>
              <MenubarItem disabled>
                Please sign in / sign up to continue!
              </MenubarItem>
            </>
          )}
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Subcriber</MenubarTrigger>
        <MenubarContent>
          <MenubarItem asChild>
            <Link href="/chat">Chat Groups</Link>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Chat AI</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem asChild>
                <Link href="/chatAI">Chat AI Assistant</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/chatAI/history">Chat AI History</Link>
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Recommendation</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem asChild>
                <Link href="/recommendation">Recommendations</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/recommendation/history">Recommendation History</Link>
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem asChild>
            <Link href="/sandbox">Code Sandbox</Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Moderator</MenubarTrigger>
        <MenubarContent>
          {roleLoading ? (
            <MenubarItem disabled>Loading...</MenubarItem>
          ) : (isModerator || isAdmin) ? (
            <>
              <MenubarItem asChild>
                <Link href="/moderator">Manage Chat Groups</Link>
              </MenubarItem>
              <MenubarItem asChild>
                <Link href="/moderator/reports">View Reports</Link>
              </MenubarItem>
            </>
          ) : (
            <MenubarItem disabled>
              You are not authorized to access this page.
            </MenubarItem>
          )}
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Admin</MenubarTrigger>
        <MenubarContent>
          {roleLoading ? (
            <MenubarItem disabled>Loading...</MenubarItem>
          ) : isAdmin ? (
            <MenubarItem asChild>
              <Link href="/admin">Admin Dashboard</Link>
            </MenubarItem>
          ) : (
            <MenubarItem disabled>
              You are not authorized to access this page.
            </MenubarItem>
          )}
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}
