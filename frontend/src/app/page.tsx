'use client';

import { useState } from 'react';
import { useSites, useCreateSite } from '@/lib/api';
import { SiteCard } from '@/components/site-card';
import { StatusBadge } from '@/components/status-badge';

export default function DashboardPage() {
  const { data: sites, isLoading, error, isRefetching } = useSites();
  const createSiteMutation = useCreateSite();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    emission_limit: '',
  });

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSiteMutation.mutateAsync({
        name: formData.name,
        location: formData.location,
        emission_limit: parseFloat(formData.emission_limit),
      });
      setFormData({ name: '', location: '', emission_limit: '' });
      setShowCreateForm(false);
    } catch (error) {
      // Error is handled by mutation
      console.error('Failed to create site:', error);
    }
  };

  const withinLimitCount = sites?.filter(
    (s) => s.status === 'Within Limit',
  ).length;
  const limitExceededCount = sites?.filter(
    (s) => s.status === 'Limit Exceeded',
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Monitor emissions across all sites
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Site
        </button>
      </div>

      {/* Stats */}
      {sites && sites.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600">Total Sites</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {sites.length}
            </p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <p className="text-sm text-green-700">Within Limit</p>
            <p className="mt-2 text-3xl font-bold text-green-900">
              {withinLimitCount}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">Limit Exceeded</p>
            <p className="mt-2 text-3xl font-bold text-red-900">
              {limitExceededCount}
            </p>
          </div>
        </div>
      )}

      {/* Create Site Form */}
      {showCreateForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Create New Site
          </h2>
          <form onSubmit={handleCreateSite} className="space-y-4">
            {createSiteMutation.error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {typeof createSiteMutation.error === 'object'
                  ? (createSiteMutation.error as any).error?.message ||
                    'Failed to create site'
                  : 'Failed to create site'}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Site Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Well Pad Alpha"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Alberta, Canada"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Emission Limit (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.emission_limit}
                onChange={(e) =>
                  setFormData({ ...formData, emission_limit: e.target.value })
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., 5000"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createSiteMutation.isPending}
                className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {createSiteMutation.isPending ? 'Creating...' : 'Create Site'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sites Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-lg border border-gray-200 bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Failed to load sites</p>
          <p className="mt-1 text-sm">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      ) : sites && sites.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-600">No sites yet.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-3 text-blue-600 hover:text-blue-700"
          >
            Create your first site →
          </button>
        </div>
      )}

      {isRefetching && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Refreshing...
        </div>
      )}
    </div>
  );
}
