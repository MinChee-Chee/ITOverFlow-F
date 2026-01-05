
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

export default function MenubarComponentAdminModerator() {
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
        <MenubarTrigger>Moderator</MenubarTrigger>
        <MenubarContent>
          {roleLoading ? (
            <MenubarItem disabled>Loading...</MenubarItem>
          ) : (isModerator || isAdmin) ? (
            <>
              <MenubarItem asChild>
                <Link href="/moderator/dashboard">Dashboard</Link>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem asChild>
                <Link href="/moderator/reports">Content Reports</Link>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem asChild>
                <Link href="/moderator">Manage Chat Groups</Link>
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
