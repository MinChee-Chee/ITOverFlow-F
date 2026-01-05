import { redirect } from 'next/navigation'
import { checkRole } from '@/utlis/roles'
import { SearchUsers } from './SearchUsers'
import { clerkClient } from '@clerk/nextjs/server'
import { removeRole, setRole, deleteUserData } from './_actions'
import { getAllUsers } from '@/lib/actions/user.action'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import Link from 'next/link'
import { EditUserDialog } from './EditUserDialog'
import Pagination from '@/components/shared/Pagination'
import Filter from '@/components/shared/Filter'
import NoResult from '@/components/shared/NoResult'
import { DeleteUserButton } from './DeleteUserButton'
import { LockUserButton } from './LockUserButton'
import { BanUserButton } from './BanUserButton'

export default async function AdminDashboard(params: {
  searchParams: Promise<{ search?: string; page?: string; filter?: string }>
}) {
  if (!(await checkRole('admin'))) {
    redirect('/')
  }

  const searchParams = await params.searchParams
  const query = searchParams.search
  const page = Number(searchParams.page) || 1
  const filter = searchParams.filter || 'new_users'

  // Fetch users from database
  const { users, isNext } = await getAllUsers({
    searchQuery: query,
    filter,
    page,
    pageSize: 10,
  })

  // Convert Mongoose documents to plain objects
  const plainUsers = users.map((user) => ({
    _id: user._id.toString(),
    clerkId: user.clerkId,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio || undefined,
    location: user.location || undefined,
    portfolioWebsite: user.portfolioWebsite || undefined,
    picture: user.picture,
    reputation: user.reputation || 0,
    joinedAt: user.joinedAt ? new Date(user.joinedAt) : new Date(),
  }))

  // Get Clerk user data for roles using getUserList (more efficient, fetches in bulk)
  const client = await clerkClient()
  const clerkUsersMap = new Map()

  try {
    // Get the clerkIds we need to fetch
    const clerkIdsToFetch = new Set(plainUsers.map(user => user.clerkId))
    
    // Fetch users from Clerk using getUserList - fetch enough to cover our users
    // We'll fetch in pages and match with our database users
    let allClerkUsers: any[] = []
    let hasMore = true
    let offset = 0
    const limit = 100 // Fetch 100 at a time

    // Fetch Clerk users until we have all the ones we need or run out
    while (hasMore && allClerkUsers.length < 500) {
      const response = await client.users.getUserList({
        limit,
        offset,
      })

      allClerkUsers = allClerkUsers.concat(response.data)
      
      // Check if we have all the users we need
      const fetchedIds = new Set(response.data.map((u: any) => u.id))
      const neededIds = Array.from(clerkIdsToFetch)
      const allFound = neededIds.every(id => fetchedIds.has(id))
      
      if (allFound || response.data.length < limit) {
        hasMore = false
      } else {
        offset += limit
      }
    }

    // Create a map of fetched Clerk users by their ID
    allClerkUsers.forEach((clerkUser) => {
      if (clerkIdsToFetch.has(clerkUser.id)) {
        clerkUsersMap.set(clerkUser.id, clerkUser)
      }
    })
  } catch (error) {
    // If we can't fetch Clerk users, continue without roles
    // Users will show "No role" but role management buttons will still work
    console.warn(`Could not fetch Clerk users: ${error instanceof Error ? error.message : 'unknown error'}`)
  }

  const userFilters = [
    { name: 'New Users', value: 'new_users' },
    { name: 'Old Users', value: 'old_users' },
    { name: 'Top Contributors', value: 'top_contributors' },
  ]

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="h1-bold text-dark100_light900">Admin Dashboard</h1>
            <p className="paragraph-regular text-dark400_light700 mt-3.5">
              Manage all users, their roles, and permissions. This dashboard is restricted to users with the <span className="font-semibold text-primary-500">admin</span> role.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/support-request">View Support Requests</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchUsers />
          <Filter filters={userFilters} containerClasses="sm:min-w-[200px]" />
        </div>

        {plainUsers.length > 0 ? (
          <>
            <div className="mt-10 flex w-full flex-col gap-6">
              {plainUsers.map((user) => {
                const clerkUser = clerkUsersMap.get(user.clerkId)
                const userRole = clerkUser
                  ? ((clerkUser.publicMetadata?.role as string) || 'No role')
                  : 'No role'
                const isLocked = clerkUser
                  ? (clerkUser.publicMetadata?.locked as boolean) || false
                  : false
                const isBanned = clerkUser
                  ? (clerkUser.publicMetadata?.banned as boolean) || clerkUser.banned || false
                  : false

                return (
                  <div
                    key={user._id}
                    className="card-wrapper rounded-lg border p-6 dark:border-dark-400"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 overflow-hidden rounded-full">
                            {user.picture ? (
                              <Image
                                src={user.picture}
                                alt={user.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex-center background-light700_dark400 size-full">
                                <Image
                                  src="/assets/icons/user.svg"
                                  alt="user"
                                  width={24}
                                  height={24}
                                  className="dark:invert"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="h3-semibold text-dark200_light900">
                              {user.name}
                            </h3>
                            <p className="paragraph-regular text-dark400_light700">
                              @{user.username}
                            </p>
                            <p className="paragraph-small text-dark400_light700">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="paragraph-medium text-dark400_light700">Role:</span>
                            <Badge
                              variant={
                                userRole === 'admin'
                                  ? 'default'
                                  : userRole === 'moderator'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className={
                                userRole === 'admin'
                                  ? 'bg-primary-500'
                                  : userRole === 'moderator'
                                  ? 'bg-light-500 dark:bg-dark-400'
                                  : 'bg-light-800 dark:bg-dark-300 text-dark-400 dark:text-light-700'
                              }
                            >
                              {userRole}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="paragraph-medium text-dark400_light700">Reputation:</span>
                            <Badge variant="outline" className="bg-light-800 dark:bg-dark-300">
                              {user.reputation || 0}
                            </Badge>
                          </div>
                          {isLocked && (
                            <Badge variant="destructive" className="bg-red-500">
                              Locked
                            </Badge>
                          )}
                          {isBanned && (
                            <Badge variant="destructive" className="bg-red-600">
                              Banned
                            </Badge>
                          )}
                          {user.location && (
                            <div className="flex items-center gap-1">
                              <Image
                                src="/assets/icons/location.svg"
                                alt="location"
                                width={14}
                                height={14}
                                className="dark:invert"
                              />
                              <span className="paragraph-small text-dark400_light700">
                                {user.location}
                              </span>
                            </div>
                          )}
                        </div>
                        {user.bio && (
                          <p className="paragraph-small text-dark400_light700 line-clamp-2">
                            {user.bio}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:min-w-[200px]">
                        <div className="flex flex-wrap gap-2">
                          

                          <form action={setRole} className="flex-1">
                            <input type="hidden" value={user.clerkId} name="id" />
                            <input type="hidden" value="moderator" name="role" />
                            <Button
                              type="submit"
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              disabled={userRole === 'moderator'}
                            >
                              Make Moderator
                            </Button>
                          </form>

                          <form action={removeRole} className="flex-1">
                            <input type="hidden" value={user.clerkId} name="id" />
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={userRole === 'No role'}
                            >
                              Remove Role
                            </Button>
                          </form>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <LockUserButton 
                            clerkId={user.clerkId} 
                            userName={user.name} 
                            isLocked={isLocked}
                          />
                          <BanUserButton 
                            clerkId={user.clerkId} 
                            userName={user.name} 
                            isBanned={isBanned}
                          />
                          <DeleteUserButton clerkId={user.clerkId} userName={user.name} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {isNext || page > 1 ? (
              <div className="mt-10">
                <Pagination
                  pageNumber={page}
                  isNext={isNext}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-10">
            <NoResult
              title="No users found"
              description={query ? `No users found matching "${query}"` : 'No users in the database yet'}
              link="/"
              linkTitle="Go Home"
            />
          </div>
        )}
      </div>
    </div>
  )
}