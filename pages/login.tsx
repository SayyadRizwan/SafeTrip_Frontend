'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, MapPin, Users } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-teal-700">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* SafeTrip Branding */}
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Shield className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">SafeTrip</h1>
          </div>
          <p className="text-blue-100">Smart Tourist Safety Monitoring</p>
          <div className="flex justify-center items-center space-x-4 mt-4 text-sm text-blue-200">
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>AI Protection</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>Geo-Fencing</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>Gang of 5</span>
            </div>
          </div>
        </div>

        {/* Clerk Sign In */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-0">
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                  card: 'shadow-none border-0',
                  headerTitle: 'text-2xl font-semibold text-gray-900',
                  headerSubtitle: 'text-gray-600'
                }
              }}
              redirectUrl="/dashboard"
            />
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center text-sm text-blue-100">
          <p>Supported by Ministry of Tourism & Ministry of Home Affairs</p>
          <p className="mt-2 font-semibold">#TravelSafeIndia</p>
        </div>
      </div>
    </div>
  );
}