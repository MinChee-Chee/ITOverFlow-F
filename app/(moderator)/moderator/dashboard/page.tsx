import { redirect } from 'next/navigation'
import { checkRole } from '@/utlis/roles'
import { getModeratorDashboardContent } from '@/lib/actions/moderator.action'
import ModeratorContentCard from '@/components/moderator/ModeratorContentCard'
import DashboardTabs from '@/components/moderator/DashboardTabs'
import Pagination from '@/components/shared/Pagination'
import Filter from '@/components/shared/Filter'

const scoreFilters = [
  { name: 'Highest Score', value: 'highScore' },
  { name: 'Lowest Score', value: 'lowScore' },
  { name: 'Most Recent', value: 'recent' },
  { name: 'Oldest', value: 'old' },
]

export default async function ModeratorDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; type?: string; filter?: string }>
}) {
  const isModerator = await checkRole('moderator')
  const isAdmin = await checkRole('admin')
  
  if (!isModerator && !isAdmin) {
    redirect('/')
  }

  const resolvedSearchParams = await searchParams
  const page = Number(resolvedSearchParams.page) || 1
  const type = (resolvedSearchParams.type as 'question' | 'answer' | 'all') || 'all'
  const sortBy = (resolvedSearchParams.filter as 'highScore' | 'lowScore' | 'recent' | 'old') || 'highScore'

  const result = await getModeratorDashboardContent({
    page,
    pageSize: 20,
    type,
    sortBy,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1-bold text-dark100_light900">Moderator Dashboard</h1>
          <p className="paragraph-regular text-dark400_light700 mt-2">
            Review and manage all questions and answers based on engagement scores
          </p>
        </div>
        <Filter filters={scoreFilters} />
      </div>

      <DashboardTabs currentType={type}>
        <ContentGrid content={result.content} type={type} />
      </DashboardTabs>

      {result.totalItems > 0 && (
        <Pagination
          pageNumber={page}
          isNext={result.isNext}
        />
      )}
    </div>
  )
}

function ContentGrid({ content, type }: { content: any[]; type: string }) {
  // Content is already filtered by type in the server action, no need to filter again
  if (content.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="paragraph-regular text-dark400_light700">
          No {type === 'all' ? 'content' : type === 'question' ? 'questions' : 'answers'} found
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {content.map((item) => (
        <ModeratorContentCard key={`${item.type}-${item._id}`} item={item} />
      ))}
    </div>
  )
}
