import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import MySupportRequests from '@/components/shared/MySupportRequests';

export const metadata: Metadata = {
  title: 'My Support Requests | ITOverFlow',
  description: 'View your support requests and responses',
};

export default function MySupportRequestsPage() {
  return (
    <div className="background-light900_dark200 text-dark200_light900 mx-auto max-w-4xl space-y-8 rounded-lg border p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="h1-bold">My Support Requests</h1>
          <p className="text-sm text-muted-foreground">
            View the status and responses to your support requests
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/support">Back to Support</Link>
        </Button>
      </div>

      <MySupportRequests />
    </div>
  );
}
