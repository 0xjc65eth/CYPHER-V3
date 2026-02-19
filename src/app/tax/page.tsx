'use client';

import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { TaxReportGenerator } from '@/components/tax/TaxReportGenerator';

export default function TaxPage() {
  return (
    <TopNavLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#0F0F23] via-[#1a1a2e] to-[#0F0F23] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Tax Reports</h1>
            <p className="text-gray-400 text-lg">
              Generate capital gains/losses reports for tax filing
            </p>
          </div>

          {/* Tax Report Generator */}
          <TaxReportGenerator />
        </div>
      </div>
    </TopNavLayout>
  );
}
