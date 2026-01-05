import { redirect } from 'next/navigation'
import { checkRole } from '@/utlis/roles'
import { getReports } from '@/lib/actions/report.action'
import LocalSearchbar from '@/components/shared/search/LocalSearchbar'
import NoResult from '@/components/shared/NoResult'
import Pagination from '@/components/shared/Pagination'
import ReportCard from '@/components/shared/ReportCard'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>
}) {
  const isModerator = await checkRole('moderator')
  const isAdmin = await checkRole('admin')
  
  if (!isModerator && !isAdmin) {
    redirect('/')
  }

  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams.q
  const page = Number(resolvedSearchParams.page) || 1
  const status = resolvedSearchParams.status as 'pending' | 'reviewed' | 'resolved' | 'dismissed' | undefined

  let reports: any[] = []
  let isNext = false

  try {
    const result = await getReports({
      page,
      pageSize: 10,
      status: status || undefined,
      searchQuery: query,
    })
    reports = result.reports || []
    isNext = result.isNext || false
  } catch (error) {
    console.error('Error fetching reports:', error)
    // Continue with empty reports array
  }

  const statusCounts = {
    pending: 0,
    reviewed: 0,
    resolved: 0,
    dismissed: 0,
  }

  // Count statuses (we'd need to fetch all reports for accurate counts, but for now we'll use a simpler approach)
  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
    { value: 'reviewed', label: 'Reviewed', color: 'bg-blue-500' },
    { value: 'resolved', label: 'Resolved', color: 'bg-green-500' },
    { value: 'dismissed', label: 'Dismissed', color: 'bg-gray-500' },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="h1-bold text-dark100_light900">Question Reports</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/moderator/reports">
          <Badge variant={!status ? "default" : "outline"} className="cursor-pointer">
            All
          </Badge>
        </Link>
        {statusOptions.map((option) => (
          <Link key={option.value} href={`/moderator/reports?status=${option.value}`}>
            <Badge 
              variant={status === option.value ? "default" : "outline"} 
              className="cursor-pointer"
            >
              {option.label}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <LocalSearchbar
          route="/moderator/reports"
          iconPosition="left"
          imgSrc="/assets/icons/search.svg"
          placeholder="Search reports..."
          otherClasses="flex-1"
        />
      </div>

      <div className="mt-10 flex w-full flex-col gap-6">
        {reports.length > 0 ? (
          <>
            <div className="flex flex-col gap-4">
              {reports.map((report: any) => (
                <ReportCard key={report._id} report={report} />
              ))}
            </div>
            <Pagination
              pageNumber={page}
              isNext={isNext}
            />
          </>
        ) : (
          <NoResult
            title="No reports found"
            description={
              status
                ? `No ${status} reports found.`
                : "No reports have been submitted yet."
            }
            link="/moderator/reports"
            linkTitle="View All Reports"
          />
        )}
      </div>
    </div>
  )
}
