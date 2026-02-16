'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSiteMetrics } from '@/lib/api';
import { StatusBadge } from '@/components/status-badge';
import { IngestionForm } from '@/components/ingestion-form';
import { EmissionsChart } from '@/components/emissions-chart';

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const { data: metrics, isLoading, error, refetch } = useSiteMetrics(siteId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded bg-gray-200 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </Link>
        <div className="rounded-lg bg-red-50 p-6 text-red-800">
          <p className="font-semibold">Failed to load site</p>
          <p className="mt-1 text-sm">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 text-sm text-red-600 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </Link>
        <div className="rounded-lg bg-yellow-50 p-6 text-yellow-800">
          Site not found
        </div>
      </div>
    );
  }

  const emissionLimit = parseFloat(metrics.emission_limit);
  const totalEmissions = parseFloat(metrics.total_emissions_to_date);
  const percentUsed = (totalEmissions / emissionLimit) * 100;
  const remainingCapacity = Math.max(0, emissionLimit - totalEmissions);

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
      >
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{metrics.name}</h1>
          <p className="mt-1 text-lg text-gray-600">{metrics.location}</p>
        </div>
        <StatusBadge status={metrics.status} size="lg" />
      </div>

      {/* Main stats grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Emissions card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Emissions Overview
          </h2>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Progress to Limit
              </span>
              <span className="text-sm font-bold text-gray-900">
                {percentUsed.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-200">
              <div
                className={`h-3 rounded-full transition-all ${
                  percentUsed > 80
                    ? 'bg-red-500'
                    : percentUsed > 50
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <span className="text-gray-700">Total Emissions</span>
              <span className="text-lg font-bold text-gray-900">
                {totalEmissions.toFixed(2)} kg
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <span className="text-gray-700">Emission Limit</span>
              <span className="text-lg font-bold text-gray-900">
                {emissionLimit.toFixed(2)} kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Remaining Capacity</span>
              <span
                className={`text-lg font-bold ${
                  remainingCapacity > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {remainingCapacity.toFixed(2)} kg
              </span>
            </div>
          </div>
        </div>

        {/* Readings card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Reading Statistics
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <span className="text-gray-700">Total Readings</span>
              <span className="text-lg font-bold text-gray-900">
                {metrics.readings_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Last Reading</span>
              <span className="text-lg font-bold text-gray-900">
                {metrics.last_reading_at
                  ? new Date(metrics.last_reading_at).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )
                  : 'No readings yet'}
              </span>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            className="mt-6 w-full rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Emissions Over Time Chart */}
      <EmissionsChart siteId={siteId} emissionLimit={emissionLimit} />

      {/* Ingestion Form */}
      <IngestionForm siteId={siteId} onSuccess={() => refetch()} />

      {/* Recent changes notice */}
      {percentUsed > 80 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Warning: Approaching Limit</p>
          <p className="mt-1 text-sm">
            This site has used {percentUsed.toFixed(1)}% of its emission limit.
            Consider reviewing recent ingestions.
          </p>
        </div>
      )}
    </div>
  );
}
