This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Real-time notifications

This project uses [Pusher Beams](https://pusher.com/beams) to deliver real-time browser notifications whenever a question receives a new answer or vote.

### Environment variables

Create a `.env.local` file and add:

```
# Pusher Beams (for push notifications)
PUSHER_BEAMS_INSTANCE_ID=<your instance id>
PUSHER_BEAMS_PRIMARY_KEY=<your primary/secret key>
NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID=<same as PUSHER_BEAMS_INSTANCE_ID>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Pusher Channels (for real-time chat)
# Create a separate Channels app at https://dashboard.pusher.com/channels
PUSHER_APP_ID=<your channels app id>
PUSHER_SECRET=<your channels secret key>
NEXT_PUBLIC_PUSHER_KEY=<your channels public key>
NEXT_PUBLIC_PUSHER_CLUSTER=<your cluster, e.g., us2>
```

### Setup checklist

1. **Pusher Beams Setup:**
   - Generate an instance in the Pusher dashboard and keep the Instance ID + Primary key handy.
   - Ensure the service worker at `/public/service-worker.js` is deployed from the root (Next.js automatically serves everything in `public/`).
   - Visit the site, sign in, and allow browser notification permissions when prompted. The client automatically registers `user-<clerkId>` interests.
   - Use the Beams Debug Console or API to send messages to an interest such as `user-123` to verify that push notifications arrive without reloading the page.

2. **Pusher Channels Setup (for chat):**
   - Go to [Pusher Dashboard](https://dashboard.pusher.com/) and create a new **Channels** app (separate from your Beams app)
   - Copy the App ID, Key, Secret, and Cluster from your Channels app
   - Add them to your `.env.local` file as shown above
   - The chat will work without Channels (messages save and load), but real-time updates require Channels to be configured

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
