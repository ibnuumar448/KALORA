"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Trophy, Award, Star, BookOpen, Zap } from 'lucide-react';

export default function IncentivesPage() {
  const [incentives, setIncentives] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchIncentives = async () => {
      try {
        // Get current user first
        const meResponse = await api.get('/students/me');
        const studentId = meResponse.data.id;
        
        // Fetch incentives summary
        const response = await api.get(`/students/${studentId}/incentives`);
        setIncentives(response.data);
      } catch (err: any) {
        console.error('Failed to fetch incentives', err);
        setError('Could not load your incentives and achievements');
      } finally {
        setLoading(false);
      }
    };
    fetchIncentives();
  }, []);

  const getScholarshipColor = (level: string | null) => {
    switch (level) {
      case 'platinum':
        return 'from-slate-100 to-slate-200 border-slate-400';
      case 'gold':
        return 'from-yellow-100 to-yellow-200 border-yellow-400';
      case 'silver':
        return 'from-gray-100 to-gray-200 border-gray-400';
      case 'bronze':
        return 'from-orange-100 to-orange-200 border-orange-400';
      default:
        return 'from-slate-50 to-slate-100 border-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Incentives & Achievements</h2>
          <p className="text-slate-500 mt-1">Your scholarships, certificates, and earned points.</p>
        </div>
        <div className="animate-pulse text-slate-500">Loading your achievements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Incentives & Achievements</h2>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Incentives & Achievements</h2>
        <p className="text-slate-500 mt-1">Your scholarships, certificates, and earned points.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-1">Incentive Points</p>
              <p className="text-3xl font-bold text-slate-900">{incentives?.total_points || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Trophy className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-1">Active Scholarships</p>
              <p className="text-3xl font-bold text-slate-900">{incentives?.active_scholarships || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Award className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-1">Certificates</p>
              <p className="text-3xl font-bold text-slate-900">{incentives?.total_certificates || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Zap className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-1">Scholarship Level</p>
              <p className="text-lg font-bold text-slate-900 capitalize">
                {incentives?.scholarship_level || 'Not Yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scholarships */}
      {incentives?.active_scholarships > 0 && (
        <Card className={`border-2 bg-gradient-to-br ${getScholarshipColor(incentives.scholarship_level)}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Active Scholarship
            </CardTitle>
            <CardDescription>
              You have earned a scholarship based on your academic performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold capitalize text-slate-900">{incentives.scholarship_level}</span> Tier Scholarship
              </p>
              <p className="text-sm text-slate-600">Keep maintaining your excellent performance to retain this award.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Incentives */}
      {incentives?.recent_incentives && incentives.recent_incentives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Recent Incentives Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incentives.recent_incentives.map((incentive: any) => (
                <div key={incentive.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{incentive.incentive_type}</p>
                    <p className="text-sm text-slate-600">{incentive.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      +{incentive.points} points • {new Date(incentive.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-yellow-600">+{incentive.points}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!incentives?.recent_incentives || incentives.recent_incentives.length === 0) && 
       incentives?.active_scholarships === 0 &&
       incentives?.total_certificates === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">Keep up the great work!</p>
            <p className="text-slate-500 text-sm mt-1">
              Achieve higher scores and maintain good conduct to earn scholarships, certificates, and incentive points.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">How to Earn Rewards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>✨ <span className="font-medium">Incentive Points:</span> Earned through perfect scores, peer tutoring, and classroom participation</p>
          <p>🏆 <span className="font-medium">Scholarships:</span> Awarded based on consistent high performance (Gold: 75%+, Platinum: 90%+)</p>
          <p>📜 <span className="font-medium">Certificates:</span> Issued when you complete modules, achieve topic mastery, or reach milestones</p>
        </CardContent>
      </Card>
    </div>
  );
}
