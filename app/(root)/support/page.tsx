import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import SupportRequestForm from '@/components/shared/SupportRequestForm';

export const metadata: Metadata = {
  title: 'Support | ITOverFlow',
  description: 'Get help and support for ITOverFlow platform',
};

export default function SupportPage() {
  return (
    <div className="background-light900_dark200 text-dark200_light900 mx-auto max-w-4xl space-y-8 rounded-lg border p-8">
      <div className="space-y-4">
        <h1 className="h1-bold">Support & Contact</h1>
        <p className="text-sm text-muted-foreground">
          We're here to help! Get in touch with us through any of the channels below.
        </p>
      </div>

      <div className="space-y-8">
        {/* My Support Requests Link */}
        <section className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="h2-semibold mb-2">View Your Support Requests</h2>
                <p className="text-sm text-muted-foreground">
                  Check the status of your submitted support requests and view admin responses.
                </p>
              </div>
              <Button asChild>
                <Link href="/support/my-requests">View My Requests</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* General Support */}
        <section className="space-y-4">
          <h2 className="h2-semibold">General Support</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">Platform Issues & Questions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For general questions about using ITOverFlow, reporting bugs, or technical issues:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Check our <Link href="/terms-of-use" className="text-primary hover:underline">Terms of Use</Link> for platform guidelines</li>
                <li>Review the FAQ section below for common questions</li>
                <li>Report issues through the platform's reporting system</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Account Support */}
        <section className="space-y-4">
          <h2 className="h2-semibold">Account Support</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">Account Issues</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For help with account-related issues:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Password reset: Use the "Forgot Password" link on the login page</li>
                <li>Account access issues: Check your email for verification links</li>
                <li>Profile updates: Edit your profile from your user profile page</li>
                <li>Terms of Use acceptance: Visit the <Link href="/terms-of-use" className="text-primary hover:underline">Terms of Use</Link> page</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Content Moderation */}
        <section className="space-y-4">
          <h2 className="h2-semibold">Content Moderation & Reports</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">Report Inappropriate Content</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you encounter inappropriate content or behavior:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Use the "Report" button on questions, answers, comments, or chat messages</li>
                <li>Moderators will review your report and take appropriate action</li>
                <li>For urgent issues, contact moderators directly through the platform</li>
              </ul>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">Appeal a Ban or Warning</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you believe you were banned or warned incorrectly:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Review the reason for your ban or warning in your notifications</li>
                <li>Check the <Link href="/terms-of-use" className="text-primary hover:underline">Terms of Use</Link> to understand platform rules</li>
                <li>Contact moderators through the platform's messaging system</li>
                <li>Provide context and explanation for your appeal</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technical Support */}
        <section className="space-y-4">
          <h2 className="h2-semibold">Technical Support</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">Technical Issues</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For technical problems with the platform:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Clear your browser cache and cookies</li>
                <li>Try using a different browser or device</li>
                <li>Check your internet connection</li>
                <li>Report persistent issues through the platform's bug reporting system</li>
              </ul>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">Code Sandbox & AI Features</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For issues with code sandbox or AI-powered features:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Code sandbox errors: Check your code syntax and browser console</li>
                <li>AI service unavailable: The service may be temporarily down, try again later</li>
                <li>AI recommendations: Verify AI-generated content before implementing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-4">
          <h2 className="h2-semibold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">Why do I need to accept the Terms of Use?</h3>
              <p className="text-sm text-muted-foreground">
                All users must accept the Terms of Use to ensure they understand and agree to the platform's rules and guidelines. This helps maintain a safe and respectful community environment.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">How do I report inappropriate content?</h3>
              <p className="text-sm text-muted-foreground">
                Use the "Report" button available on questions, answers, comments, and chat messages. Moderators will review your report and take appropriate action.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">What happens if I'm banned from a chat group?</h3>
              <p className="text-sm text-muted-foreground">
                If you're banned from a chat group, you'll receive a 2-day ban. All your messages in that group will be deleted, and you won't be able to send messages or join the group during the ban period.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">How do I update my profile?</h3>
              <p className="text-sm text-muted-foreground">
                Navigate to your profile page and click the "Edit Profile" button. You can update your name, bio, location, portfolio website, and profile picture.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="h3-semibold mb-2">Can I delete my account?</h3>
              <p className="text-sm text-muted-foreground">
                Account deletion functionality may be available through your account settings. Contact support if you need assistance with account deletion.
              </p>
            </div>
          </div>
        </section>

        {/* Community Guidelines */}
        <section className="space-y-4">
          <h2 className="h2-semibold">Community Guidelines</h2>
          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground mb-4">
              To maintain a positive and productive community, please:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>Be respectful and professional in all interactions</li>
              <li>Follow the content guidelines outlined in the <Link href="/terms-of-use" className="text-primary hover:underline">Terms of Use</Link></li>
              <li>Report inappropriate behavior instead of engaging in conflicts</li>
              <li>Help others learn and grow by providing constructive feedback</li>
              <li>Respect intellectual property rights and give credit where due</li>
            </ul>
          </div>
        </section>

        {/* Quick Links */}
        <section className="space-y-4">
          <h2 className="h2-semibold">Quick Links</h2>
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="outline">
              <Link href="/terms-of-use">Terms of Use</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </section>

        {/* Support Request Form */}
        <section className="space-y-4">
          <h2 className="h2-semibold">Submit a Support Request</h2>
          <SupportRequestForm />
        </section>

        {/* Contact Note */}
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h3 className="h3-semibold mb-2">Need More Help?</h3>
          <p className="text-sm text-muted-foreground">
            If you can't find the answer to your question here, please submit a support request using the form above. We aim to respond to all inquiries within 24-48 hours.
          </p>
        </section>
      </div>
    </div>
  );
}
