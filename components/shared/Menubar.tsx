
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

export default function MenubarComponent() {
  const { user, isLoaded } = useUser()
  const userId = user?.id

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
          <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
          <MenubarCheckboxItem checked>
            Always Show Full URLs
          </MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarItem inset>
            Reload <MenubarShortcut>⌘R</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled inset>
            Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem inset>Toggle Fullscreen</MenubarItem>
          <MenubarSeparator />
          <MenubarItem inset>Hide Sidebar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Admin</MenubarTrigger>
        <MenubarContent>
          <MenubarRadioGroup value="benoit">
            <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
            <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
            <MenubarRadioItem value="Luis">Luis</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <MenubarItem inset>Edit...</MenubarItem>
          <MenubarSeparator />
          <MenubarItem inset>Add Profile...</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}
