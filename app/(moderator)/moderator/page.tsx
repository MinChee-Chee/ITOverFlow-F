import { redirect } from 'next/navigation'
import { checkRole } from '@/utlis/roles'
import { auth } from '@clerk/nextjs/server'
import { getModeratorChatGroups } from '@/lib/actions/chat.action'
import { getUserById } from '@/lib/actions/user.action'
import CreateChatGroupDialog from '@/components/chat/CreateChatGroupDialog'
import ChatGroupManagementList from '@/components/chat/ChatGroupManagementList'
import LocalSearchbar from '@/components/shared/search/LocalSearchbar'
import NoResult from '@/components/shared/NoResult'

export default async function ModeratorPage(params: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const isModerator = await checkRole('moderator')
  const isAdmin = await checkRole('admin')
  
  if (!isModerator && !isAdmin) {
    redirect('/')
  }

  const { userId } = await auth()
  if (!userId) {
    redirect('/')
  }

  const user = await getUserById({ userId })
  if (!user) {
    redirect('/')
  }

  const searchParams = await params.searchParams
  const query = searchParams.q
  const page = Number(searchParams.page) || 1

  const { chatGroups, isNext } = await getModeratorChatGroups({
    moderatorId: user._id.toString(),
    searchQuery: query,
    page,
    pageSize: 10,
  })

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="h1-bold text-dark100_light900">Manage Chat Groups</h1>
        <div className="flex justify-end">
          <CreateChatGroupDialog />
        </div>
      </div>

      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <LocalSearchbar
          route="/moderator"
          iconPosition="left"
          imgSrc="/assets/icons/search.svg"
          placeholder="Search chat groups..."
          otherClasses="flex-1"
        />
      </div>

      <div className="mt-10 flex w-full flex-col gap-6">
        {chatGroups.length > 0 ? (
          <ChatGroupManagementList
            chatGroups={chatGroups}
            isNext={isNext}
            currentPage={page}
          />
        ) : (
          <NoResult
            title="No chat groups found"
            description="You haven't created any chat groups yet. Create your first one!"
            link="/moderator"
            linkTitle="Create Chat Group"
          />
        )}
      </div>
    </div>
  )
}

