import { Metadata } from 'next';
import Link from 'next/link';
import AcceptTermsButton from '@/components/shared/AcceptTermsButton';

export const metadata: Metadata = {
  title: 'Terms of Use | ITOverFlow',
  description: 'Terms of Use and Service Agreement for ITOverFlow',
};

export default function TermsOfUsePage() {
  return (
    <div className="background-light900_dark200 text-dark200_light900 mx-auto max-w-4xl space-y-8 rounded-lg border p-8">
      <div className="space-y-4">
        <h1 className="h1-bold">Terms of Use</h1>
        <p className="text-sm text-muted-foreground">
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        <section className="space-y-4">
          <h2 className="h2-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing and using ITOverFlow ("the Platform", "we", "us", or "our"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
          <p className="font-semibold">
            <strong>Terms Acceptance Requirement:</strong> All new users must explicitly accept these Terms of Use during or immediately after registration. You will be prompted to review and accept these terms before you can fully access and use the Platform. By clicking "Accept Terms & Continue" or similar acceptance mechanisms, you acknowledge that you have read, understood, and agree to be bound by all provisions of these Terms of Use.
          </p>
          <p>
            Existing users may be required to accept updated Terms of Use when significant changes are made. Continued use of the Platform after such updates constitutes your acceptance of the modified terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">2. Description of Service</h2>
          <p>
            ITOverFlow is a question-and-answer platform for IT professionals and enthusiasts. The Platform provides:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Question and answer functionality for technical topics</li>
            <li>Community chat groups for discussions</li>
            <li>AI-powered recommendations and tag information</li>
            <li>Code sandbox for testing and sharing code</li>
            <li>User profiles, reputation system, and badges</li>
            <li>Content moderation and reporting features</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">3. User Accounts and Registration</h2>
          <p>
            To use certain features of the Platform, you must register for an account. During the registration process, you will be required to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Accept these Terms of Use:</strong> You must explicitly agree to these Terms of Use by checking the acceptance checkbox and clicking the "Accept Terms & Continue" button. Your account will not be fully activated until you have accepted these terms.</li>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and update your account information to keep it accurate</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
          <p>
            <strong>Note:</strong> If you do not accept these Terms of Use during registration, you will not be able to access the full features of the Platform. You may be prompted to accept the terms each time you log in until you have completed the acceptance process.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">4. User Conduct and Content</h2>
          <p>
            You agree not to use the Platform to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Post, upload, or transmit any content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable</li>
            <li>Post content that infringes on intellectual property rights, privacy rights, or other rights of others</li>
            <li>Post spam, unsolicited messages, or engage in any form of automated data collection</li>
            <li>Impersonate any person or entity or falsely state or misrepresent your affiliation with any person or entity</li>
            <li>Interfere with or disrupt the Platform or servers or networks connected to the Platform</li>
            <li>Use the Platform for any commercial purpose without our express written consent</li>
            <li>Attempt to gain unauthorized access to any portion of the Platform or any other accounts, computer systems, or networks</li>
            <li>Post malicious code, viruses, or any other harmful software</li>
            <li>Engage in any activity that violates applicable laws or regulations</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">5. Content Moderation and Chat Guidelines</h2>
          <p>
            The Platform employs automated and manual content moderation. Users must:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Refrain from using profanity, abusive language, or hate speech in chat groups or any content</li>
            <li>Respect other users and maintain a professional and friendly environment</li>
            <li>Report inappropriate content or behavior to moderators</li>
            <li>Accept that moderators may ban users from chat groups for violations (2-day ban period)</li>
            <li>Understand that all messages from banned users will be deleted</li>
            <li>Comply with moderator decisions regarding content and user conduct</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">6. Intellectual Property Rights</h2>
          <p>
            You retain ownership of content you post on the Platform. However, by posting content, you grant us:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>A worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute your content</li>
            <li>The right to sublicense these rights to other users of the Platform</li>
            <li>The right to remove or modify your content at our discretion</li>
          </ul>
          <p>
            The Platform's design, logos, and software are protected by intellectual property laws and remain our property.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">7. Code Sandbox and AI Services</h2>
          <p>
            When using the code sandbox or AI-powered features:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You are responsible for the code you write and execute</li>
            <li>We are not liable for any damage caused by code execution</li>
            <li>AI-generated content is provided "as-is" and may contain errors</li>
            <li>You should verify AI recommendations before implementing them</li>
            <li>Resource limits may apply to prevent abuse</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">8. Privacy and Data Protection</h2>
          <p>
            Your use of the Platform is also governed by our Privacy Policy. We collect and process:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account information (name, email, username, profile picture)</li>
            <li>Content you post (questions, answers, comments, chat messages)</li>
            <li>Usage data and analytics</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
          <p>
            We use this data to provide and improve the Platform, enforce these Terms, and comply with legal obligations.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">9. User Bans and Account Restrictions</h2>
          <p>
            We reserve the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Ban users from chat groups for violations (2-day ban period)</li>
            <li>Delete all messages from banned users</li>
            <li>Suspend or terminate accounts for serious violations</li>
            <li>Remove content that violates these Terms</li>
            <li>Issue warnings for minor violations</li>
          </ul>
          <p>
            Banned users will be notified and cannot participate in the affected chat group during the ban period.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">10. Disclaimers and Limitations of Liability</h2>
          <p>
            THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p>
            We are not liable for:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Any errors or omissions in content</li>
            <li>Any loss or damage resulting from your use of the Platform</li>
            <li>Any interruption or cessation of the Platform</li>
            <li>Any damage caused by code execution in the sandbox</li>
            <li>Any inaccuracies in AI-generated content</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless ITOverFlow, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your use of the Platform</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another user or third party</li>
            <li>Content you post on the Platform</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">12. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of significant changes through the Platform interface. When significant changes are made:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You will be prompted to review and accept the updated Terms of Use</li>
            <li>You must accept the updated terms to continue using the Platform</li>
            <li>The acceptance dialog will appear when you log in or access the Platform</li>
            <li>You can view the full updated terms on this page before accepting</li>
          </ul>
          <p>
            Continued use of the Platform after accepting updated Terms constitutes your agreement to be bound by the modified Terms. If you do not agree to the updated Terms, you must stop using the Platform and may terminate your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">13. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Platform immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">14. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the Platform shall be resolved through appropriate legal channels.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="h2-semibold">15. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Use, please visit our <Link href="/support" className="text-primary hover:underline font-semibold">Support Page</Link> for detailed information about support channels and how to get help.
          </p>
          <p>
            For general support, account issues, content moderation concerns, or technical problems, please use the support resources available on the Platform's <Link href="/support" className="text-primary hover:underline font-semibold">Support & Contact</Link> page.
          </p>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h2 className="h2-semibold">Acknowledgment</h2>
          <p>
            BY USING ITOVERFLOW, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF USE, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT USE THE PLATFORM.
          </p>
        </section>
      </div>

      <AcceptTermsButton />
    </div>
  );
}
