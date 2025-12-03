"use client"

import { useCallback, memo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TagCard from '@/components/cards/TagCard'
import { Badge } from '@/components/ui/badge'
import EditChatGroupDialog from './EditChatGroupDialog'
import DeleteChatGroupButton from './DeleteChatGroupButton'
import Pagination from '@/components/shared/Pagination'

interface Tag {
  _id: string
  name: string
}

interface User {
  _id: string
  clerkId: string
  name: string
  picture: string
  username: string
}

interface ChatGroup {
  _id: string
  name: string
  description?: string
  tags: Tag[]
  moderator: User
  members: User[]
  createdAt: string
  updatedAt: string
}

interface ChatGroupManagementListProps {
  chatGroups: ChatGroup[]
  isNext: boolean
  currentPage: number
}

function ChatGroupManagementList({
  chatGroups,
  isNext,
  currentPage,
}: ChatGroupManagementListProps) {
  const router = useRouter()

  const handleGroupUpdated = useCallback(() => {
    router.refresh()
  }, [router])

  const handleGroupDeleted = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4">
        {chatGroups.map((group) => (
          <div
            key={group._id}
            className="background-light900_dark200 light-border flex flex-col gap-4 rounded-lg border p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="h3-semibold text-dark200_light900">
                    {group.name}
                  </h3>
                  <Badge className="background-light800_dark300 text-light400_light500">
                    {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                  </Badge>
                </div>
                
                {group.description && (
                  <p className="text-dark300_light700 body-regular">
                    {group.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <TagCard
                      key={tag._id}
                      _id={tag._id}
                      name={tag.name}
                      compact
                      noLink
                    />
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-light400_light500">
                  <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                  <span>Updated: {new Date(group.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <EditChatGroupDialog
                  chatGroup={group}
                  onGroupUpdated={handleGroupUpdated}
                />
                <DeleteChatGroupButton
                  chatGroupId={group._id}
                  chatGroupName={group.name}
                  onGroupDeleted={handleGroupDeleted}
                />
                <Link href={`/chat?groupId=${group._id}`}>
                  <button className="background-light800_dark400 text-light400_light500 hover:background-light700_dark300 flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors">
                    View Chat
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {chatGroups.length > 0 && (
        <Pagination
          pageNumber={currentPage}
          isNext={isNext}
        />
      )}
    </div>
  )
}

export default memo(ChatGroupManagementList)

