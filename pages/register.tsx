'use client';

import { SignUp } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Smartphone, Globe } from 'lucide-react';

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-900 via-blue-800 to-blue-900">
      <div className="max-w-2xl w-full space-y-8 p-8">
        {/* Hero Section */}
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-6">
            <Shield className="h-10 w-10 text-white" />
            <h1 className="text-4xl font-bold text-white">Join SafeTrip</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <Shield className="h-8 w-8 text-white mx-auto mb-2" />
              <h3 className="font-semibold text-white">AI-Powered Safety</h3>
              <p className="text-sm text-blue-100">Real-time incident detection</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <Smartphone className="h-8 w-8 text-white mx-auto mb-2" />
              <h3 className="font-semibold text-white">Digital ID</h3>
              <p className="text-sm text-blue-100">Blockchain-based identity</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <Globe className="h-8 w-8 text-white mx-auto mb-2" />
              <h3 className="font-semibold text-white">Travel Groups</h3>
              <p className="text-sm text-blue-100">Gang of 5 safety network</p>
            </div>
          </div>
        </div>

        {/* Clerk Sign Up */}
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-0">
            <SignUp 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-teal-600 hover:bg-teal-700',
                  card: 'shadow-none border-0',
                  headerTitle: 'text-2xl font-semibold text-gray-900',
                  headerSubtitle: 'text-gray-600'
                }
              }}
              redirectUrl="/onboarding"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}