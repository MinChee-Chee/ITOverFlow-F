import { redirect } from 'next/navigation'
import { checkRole } from '@/utlis/roles'
import { connectToDatabase } from '@/lib/mongoose'
import SupportRequest from '@/database/supportRequest.model'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import Image from 'next/image'
import SupportRequestResponseForm from '@/components/admin/SupportRequestResponseForm'

export default async function SupportRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await checkRole('admin'))) {
    redirect('/')
  }

  const { id } = await params

  await connectToDatabase()

  const supportRequest = await SupportRequest.findById(id)
    .populate('userId', 'name username email picture')
    .populate('respondedBy', 'name username')
    .lean() as any

  if (!supportRequest) {
    redirect('/admin/support-request')
  }

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'in_progress':
        return 'secondary'
      case 'resolved':
        return 'outline'
      case 'closed':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: 'General',
      account: 'Account',
      technical: 'Technical',
      content: 'Content',
      billing: 'Billing',
      other: 'Other',
    }
    return labels[category] || category
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="h1-bold text-dark100_light900">Support Request Details</h1>
            <p className="paragraph-regular text-dark400_light700 mt-2">
              View and respond to support request #{String(supportRequest._id).slice(-8)}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/support-request">Back to Support Requests</Link>
          </Button>
        </div>

        <div className="background-light900_dark200 rounded-lg border p-6 space-y-6">
          {/* User Information */}
          <div className="flex items-start gap-4">
            <Link href={`/profile/${supportRequest.userId._id}`}>
              <Image
                src={supportRequest.userId.picture || '/assets/images/default-logo.svg'}
                alt={supportRequest.userId.name}
                width={60}
                height={60}
                className="rounded-full"
              />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/profile/${supportRequest.userId._id}`}
                  className="h3-semibold text-dark100_light900 hover:text-primary-500"
                >
                  {supportRequest.userId.name}
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                @{supportRequest.userId.username}
              </p>
              <p className="text-sm text-muted-foreground">
                {supportRequest.userId.email}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={getStatusBadgeVariant(supportRequest.status)}>
                {supportRequest.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {getCategoryLabel(supportRequest.category)}
              </Badge>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-4">
            <div>
              <h3 className="h3-semibold text-dark100_light900 mb-2">
                {supportRequest.subject}
              </h3>
              <div className="text-sm text-muted-foreground mb-4">
                Submitted: {formatDate(supportRequest.createdAt)}
              </div>
              <div className="background-light800_dark400 rounded-lg p-4">
                <p className="text-sm text-dark400_light700 whitespace-pre-wrap">
                  {supportRequest.message}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Response Section */}
          {supportRequest.adminResponse ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">Admin Response:</span>
                {supportRequest.respondedBy && (
                  <span className="text-sm text-muted-foreground">
                    by {supportRequest.respondedBy.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-dark400_light700 whitespace-pre-wrap mb-2">
                {supportRequest.adminResponse}
              </p>
              {supportRequest.respondedAt && (
                <p className="text-xs text-muted-foreground">
                  Responded: {formatDate(supportRequest.respondedAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No response yet. Use the form below to respond to this request.
              </p>
            </div>
          )}

          {/* Response Form */}
          <SupportRequestResponseForm
            supportRequestId={String(supportRequest._id)}
            currentStatus={supportRequest.status}
            hasResponse={!!supportRequest.adminResponse}
          />
        </div>
      </div>
    </div>
  )
}
