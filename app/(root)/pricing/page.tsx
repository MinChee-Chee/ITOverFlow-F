import { PricingTable } from '@clerk/nextjs'

export default function PricingPage() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="h1-bold text-dark100_light900 mb-4">Choose Your Plan</h1>
        <p className="body-regular text-dark500_light700 max-w-2xl mx-auto">
          Unlock the full potential of our platform with a subscription. Get access to the Code Sandbox and other premium features.
        </p>
      </div>
      
      <div className="flex justify-center">
        <PricingTable />
      </div>
      
      <div className="mt-8 p-6 bg-light-800 dark:bg-dark-300 rounded-lg">
        <h2 className="h3-semibold text-dark200_light900 mb-4">What's Included</h2>
        <ul className="small-regular text-dark500_light700 space-y-2 list-disc list-inside">
          <li>Access to Code Sandbox with multiple programming languages</li>
          <li>Secure code execution via Judge0 API</li>
          <li>Real-time code preview and testing</li>
          <li>Priority support</li>
          <li>And more features coming soon!</li>
        </ul>
      </div>
    </div>
  )
}

