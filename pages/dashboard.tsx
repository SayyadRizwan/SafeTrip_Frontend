'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import LiveMap from '@/components/dashboard/LiveMap';
import AlertsFeed from '@/components/dashboard/AlertsFeed';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  MapPin, 
  Users, 
  AlertTriangle, 
  Activity,
  Zap
} from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useGeolocation } from '@/hooks/useGeolocation';

interface DashboardStats {
  activeIncidents: number;
  safeZones: number;
  groupMembers: number;
  aiAlerts: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { location, isTracking, startTracking } = useGeolocation();
  const [stats, setStats] = useState<DashboardStats>({
    activeIncidents: 0,
    safeZones: 3,
    groupMembers: 0,
    aiAlerts: 2
  });

  useEffect(() => {
    if (socket) {
      socket.on('dashboard_update', (data) => {
        setStats(data.stats);
      });

      socket.on('location_update', (data) => {
        // Handle location updates from group members
      });
    }
  }, [socket]);

  const statusColor = stats.activeIncidents > 0 ? 'destructive' : 'success';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-gray-600">
            Your safety dashboard - Real-time monitoring active
          </p>
        </div>
        <Badge variant={statusColor} className="text-lg px-4 py-2">
          <Activity className="h-4 w-4 mr-2" />
          {stats.activeIncidents === 0 ? 'All Safe' : `${stats.activeIncidents} Alert(s)`}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Safety Status</p>
                <p className="text-2xl font-bold text-green-600">Protected</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Safe Zones</p>
                <p className="text-2xl font-bold text-blue-600">{stats.safeZones}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Group Members</p>
                <p className="text-2xl font-bold text-purple-600">{stats.groupMembers}/5</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Alerts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.aiAlerts}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Live Location & Geofencing</span>
                {isTracking && (
                  <Badge variant="success" className="ml-auto">
                    <Activity className="h-3 w-3 mr-1" />
                    Tracking Active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveMap 
                userLocation={location}
                geofences={[]}
                incidents={[]}
                groupMembers={[]}
              />
              {!isTracking && (
                <div className="mt-4 text-center">
                  <Button onClick={startTracking} className="bg-blue-600 hover:bg-blue-700">
                    <Shield className="h-4 w-4 mr-2" />
                    Start Location Tracking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <AlertsFeed />
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <AlertTriangle className="h-6 w-6 mb-2" />
              Emergency SOS
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              Find Group
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <MapPin className="h-6 w-6 mb-2" />
              Set Safe Zone
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Shield className="h-6 w-6 mb-2" />
              Safety Check
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}