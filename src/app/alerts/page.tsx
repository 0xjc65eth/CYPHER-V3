'use client';

import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { AlertManager } from '@/components/alerts/AlertManager';

export default function AlertsPage() {
  return (
    <TopNavLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#0F0F23] via-[#1a1a2e] to-[#0F0F23] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Alert Management</h1>
            <p className="text-gray-400 text-lg">
              Set up price alerts, volume spikes, whale movements, and more
            </p>
          </div>

          {/* Alert Manager Component */}
          <AlertManager userId="demo-user" />
        </div>
      </div>
    </TopNavLayout>
  );
}
