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
    <div className="background-light900_dark200 text-dark200_light900 mx-auto max-w-4xl space-y-6 sm:space-y-8 rounded-lg border p-4 sm:p-6 md:p-8">
      <div className="space-y-2 sm:space-y-4">
        <h1 className="h1-bold text-[24px] sm:text-[28px] md:text-[30px]">Support & Contact</h1>
        <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
          We're here to help! Get in touch with us through any of the channels below.
        </p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* My Support Requests Link */}
        <section className="space-y-3 sm:space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className='flex-1'>
                <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px] mb-2">View Your Support Requests</h2>
                <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
                  Check the status of your submitted support requests and view admin responses.
                </p>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/support/my-requests">View My Requests</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* General Support */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px]">General Support</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Platform Issues & Questions</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700 mb-3 sm:mb-4">
                For general questions about using ITOverFlow, reporting bugs, or technical issues:
              </p>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-dark-400 dark:text-light-700">
                <li>Check our <Link href="/terms-of-use" className="text-primary hover:underline">Terms of Use</Link> for platform guidelines</li>
                <li>Review the FAQ section below for common questions</li>
                <li>Report issues through the platform's reporting system</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Account Support */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px]">Account Support</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Account Issues</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700 mb-3 sm:mb-4">
                For help with account-related issues:
              </p>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-dark-400 dark:text-light-700">
                <li>Password reset: Use the "Forgot Password" link on the login page</li>
                <li>Account access issues: Check your email for verification links</li>
                <li>Profile updates: Edit your profile from your user profile page</li>
                <li>Terms of Use acceptance: Visit the <Link href="/terms-of-use" className="text-primary hover:underline">Terms of Use</Link> page</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Content Moderation */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px]">Content Moderation & Reports</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Report Inappropriate Content</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700 mb-3 sm:mb-4">
                If you encounter inappropriate content or behavior:
              </p>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-dark-400 dark:text-light-700">
                <li>Use the "Report" button on questions, answers, comments, or chat messages</li>
                <li>Moderators will review your report and take appropriate action</li>
                <li>For urgent issues, contact moderators directly through the platform</li>
              </ul>
            </div>

            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Appeal a Ban or Warning</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700 mb-3 sm:mb-4">
                If you believe you were banned or warned incorrectly:
              </p>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-dark-400 dark:text-light-700">
                <li>Review the reason for your ban or warning in your notifications</li>
                <li>Check the <Link href="/terms-of-use" className="text-primary hover:underline">Terms of Use</Link> to understand platform rules</li>
                <li>Contact moderators through the platform's messaging system</li>
                <li>Provide context and explanation for your appeal</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technical Support */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px]">Technical Support</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Technical Issues</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700 mb-3 sm:mb-4">
                For technical problems with the platform:
              </p>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-dark-400 dark:text-light-700">
                <li>Clear your browser cache and cookies</li>
                <li>Try using a different browser or device</li>
                <li>Check your internet connection</li>
                <li>Report persistent issues through the platform's bug reporting system</li>
              </ul>
            </div>

            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Code Sandbox & AI Features</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700 mb-3 sm:mb-4">
                For issues with code sandbox or AI-powered features:
              </p>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-dark-400 dark:text-light-700">
                <li>Code sandbox errors: Check your code syntax and browser console</li>
                <li>AI service unavailable: The service may be temporarily down, try again later</li>
                <li>AI recommendations: Verify AI-generated content before implementing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px]">Frequently Asked Questions</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Why do I need to accept the Terms of Use?</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
                All users must accept the Terms of Use to ensure they understand and agree to the platform's rules and guidelines. This helps maintain a safe and respectful community environment.
              </p>
            </div>

            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">How do I report inappropriate content?</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
                Use the "Report" button available on questions, answers, comments, and chat messages. Moderators will review your report and take appropriate action.
              </p>
            </div>

            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">What happens if I'm banned from a chat group?</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
                If you're banned from a chat group, you'll receive a 2-day ban. All your messages in that group will be deleted, and you won't be able to send messages or join the group during the ban period.
              </p>
            </div>

            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">How do I update my profile?</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
                Navigate to your profile page and click the "Edit Profile" button. You can update your name, bio, location, portfolio website, and profile picture.
              </p>
            </div>

            <div className="rounded-lg border p-4 sm:p-6">
              <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Can I delete my account?</h3>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
                Account deletion functionality may be available through your account settings. Contact support if you need assistance with account deletion.
              </p>
            </div>
          </div>
        </section>

        {/* Community Guidelines */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px]">Community Guidelines</h2>
          <div className="rounded-lg border p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700 mb-3 sm:mb-4">
              To maintain a positive and productive community, please:
            </p>
            <ul className="list-disc pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-dark-400 dark:text-light-700">
              <li>Be respectful and professional in all interactions</li>
              <li>Follow the content guidelines outlined in the <Link href="/terms-of-use" className="text-primary hover:underline">Terms of Use</Link></li>
              <li>Report inappropriate behavior instead of engaging in conflicts</li>
              <li>Help others learn and grow by providing constructive feedback</li>
              <li>Respect intellectual property rights and give credit where due</li>
            </ul>
          </div>
        </section>

        {/* Quick Links */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px]">Quick Links</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/terms-of-use">Terms of Use</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </section>

        {/* Support Request Form */}
        <section className="space-y-3 sm:space-y-4">
          <h2 className="h2-semibold text-[20px] sm:text-[22px] md:text-[24px]">Submit a Support Request</h2>
          <SupportRequestForm />
        </section>

        {/* Contact Note */}
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-6">
          <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Need More Help?</h3>
          <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
            If you can't find the answer to your question here, please submit a support request using the form above. We aim to respond to all inquiries within 24-48 hours.
          </p>
        </section>
      </div>
    </div>
  );
}
