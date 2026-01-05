import { redirect } from 'next/navigation'
import { checkRole } from '@/utlis/roles'
import SupportRequestsList from '@/components/admin/SupportRequestsList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function SupportRequestsPage() {
  if (!(await checkRole('admin'))) {
    redirect('/')
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="h1-bold text-dark100_light900">Support Requests</h1>
            <p className="paragraph-regular text-dark400_light700 mt-3.5">
              View and manage all user support requests. Respond to inquiries and update request status.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>

        <SupportRequestsList />
      </div>
    </div>
  )
}
