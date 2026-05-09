import { SignUp } from '@clerk/nextjs'
import { Logo } from '@/components/ui/logo'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-green-100">
            <Logo size="md" />
          </div>
          <p className="text-gray-600 text-sm">
            Create your account to get started
          </p>
        </div>

        {/* Clerk Sign-Up Component */}
        <div className="flex justify-center">
          <SignUp 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200',
                card: 'bg-white shadow-xl rounded-lg border-0 p-8',
                headerTitle: 'text-2xl font-bold text-gray-900 mb-2',
                headerSubtitle: 'text-gray-600 text-sm mb-6',
                socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200',
                socialButtonsBlockButtonText: 'text-gray-700 font-medium',
                formFieldInput: 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500',
                formFieldLabel: 'block text-sm font-medium text-gray-700 mb-1',
                footerActionLink: 'text-red-600 hover:text-red-700 font-medium',
                identityPreviewText: 'text-gray-600',
                identityPreviewEditButton: 'text-red-600 hover:text-red-700'
              },
              layout: {
                socialButtonsPlacement: 'top',
                socialButtonsVariant: 'blockButton'
              }
            }}
            fallbackRedirectUrl="/dashboard"
            signInUrl="/sign-in"
          />
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/sign-in" className="font-medium text-red-600 hover:text-red-700 transition-colors duration-200">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
