import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10"></div>
      
      <Card className="w-full max-w-md shadow-2xl border-0 backdrop-blur-sm bg-white/95">
        <CardHeader className="text-center space-y-6 pb-8">
          {/* Logo Container */}
          <div className="flex justify-center mb-4">
            <div className="relative w-20 h-20">
              {/* Building outline icon - represents property management */}
              <svg
                className="w-full h-full text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Main building */}
                <rect x="4" y="5" width="16" height="14" stroke="currentColor" strokeWidth="1.5" fill="none" rx="1" />
                
                {/* Building divisions */}
                <line x1="10" y1="5" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5" />
                <line x1="14" y1="5" x2="14" y2="19" stroke="currentColor" strokeWidth="1.5" />
                <line x1="4" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="1.5" />
                <line x1="4" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5" />
                <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1.5" />
                
                {/* Windows */}
                <circle cx="6.5" cy="7" r="0.8" fill="currentColor" />
                <circle cx="12" cy="7" r="0.8" fill="currentColor" />
                <circle cx="17.5" cy="7" r="0.8" fill="currentColor" />
                
                <circle cx="6.5" cy="11" r="0.8" fill="currentColor" />
                <circle cx="12" cy="11" r="0.8" fill="currentColor" />
                <circle cx="17.5" cy="11" r="0.8" fill="currentColor" />
                
                <circle cx="6.5" cy="15" r="0.8" fill="currentColor" />
                <circle cx="12" cy="15" r="0.8" fill="currentColor" />
                <circle cx="17.5" cy="15" r="0.8" fill="currentColor" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Property Tracker
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              Manage properties and track expenses effortlessly
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
            className="space-y-6"
          >
            {/* Features list */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center">
                <div className="text-2xl mb-1">📊</div>
                <p className="text-xs font-medium text-slate-700">Analytics</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">💰</div>
                <p className="text-xs font-medium text-slate-700">Expenses</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🏠</div>
                <p className="text-xs font-medium text-slate-700">Properties</p>
              </div>
            </div>
            
            {/* Google Sign In Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-200 font-semibold text-base group"
            >
              <svg
                className="w-5 h-5 mr-3 transition-transform duration-200 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Google G Logo - Full color */}
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
            
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-slate-500 font-medium">OR</span>
              </div>
            </div>
            
            {/* Demo info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-700 mb-1">
                <span className="font-semibold">First time here?</span>
              </p>
              <p className="text-xs text-slate-600">
                Sign in with Google to create or access your account
              </p>
            </div>
            
            {/* Footer */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-center text-slate-500 leading-relaxed">
                By signing in, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
