'use client';

import Link from 'next/link';
import { Site } from '@/lib/api';
import { StatusBadge } from './status-badge';

interface SiteCardProps {
  site: Site;
}

export function SiteCard({ site }: SiteCardProps) {
  const emissionLimit = parseFloat(site.emission_limit);
  const totalEmissions = parseFloat(site.total_emissions_to_date);
  const percentUsed = (totalEmissions / emissionLimit) * 100;

  return (
    <Link href={`/sites/${site.id}`}>
      <div className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
        {/* Header with name and status */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              {site.name}
            </h3>
            <p className="mt-1 text-sm text-gray-600">{site.location}</p>
          </div>
          <StatusBadge status={site.status} size="sm" />
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              Emissions Progress
            </span>
            <span className="text-xs font-semibold text-gray-900">
              {percentUsed.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full transition-all ${
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs text-gray-600">Total Emissions</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {totalEmissions.toFixed(2)} kg
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Limit</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {emissionLimit.toFixed(2)} kg
            </p>
          </div>
        </div>

        {/* Hover indicator */}
        <div className="mt-4 text-right">
          <span className="text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}
