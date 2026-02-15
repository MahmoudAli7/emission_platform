'use client';

import { useState } from 'react';
import { useSubmitIngestion, type Reading } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

interface IngestionFormProps {
  siteId: string;
  onSuccess?: () => void;
}

export function IngestionForm({ siteId, onSuccess }: IngestionFormProps) {
  const [readings, setReadings] = useState<Reading[]>([
    { value: 0, recorded_at: new Date().toISOString() },
  ]);
  const [isExpanded, setIsExpanded] = useState(false);
  // batch_key is generated once and reused on retry — this is how the frontend
  // collaborates with the backend to prevent duplicate ingestion on network retries.
  const [batchKey, setBatchKey] = useState(uuidv4());
  const [lastResult, setLastResult] = useState<{
    duplicate: boolean;
    readings_processed: number;
  } | null>(null);
  const mutation = useSubmitIngestion();

  const handleAddReading = () => {
    if (readings.length < 100) {
      setReadings([
        ...readings,
        { value: 0, recorded_at: new Date().toISOString() },
      ]);
    }
  };

  const handleRemoveReading = (index: number) => {
    if (readings.length > 1) {
      setReadings(readings.filter((_, i) => i !== index));
    }
  };

  const handleUpdateReading = (
    index: number,
    field: 'value' | 'recorded_at',
    newValue: string | number,
  ) => {
    const updated = [...readings];
    if (field === 'value') {
      updated[index].value = parseFloat(newValue as string) || 0;
    } else {
      updated[index].recorded_at = newValue as string;
    }
    setReadings(updated);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    try {
      // Reuse the same batchKey — if this is a retry, the backend will
      // detect the duplicate batch_key and return { duplicate: true }
      // instead of double-counting emissions.
      const result = await mutation.mutateAsync({
        site_id: siteId,
        batch_key: batchKey,
        readings,
      });

      setLastResult(result);

      if (!result.duplicate) {
        // Only reset form and generate a new batch_key on a genuinely new submission.
        // If it was a duplicate, we keep the form state so the user can see what happened.
        setReadings([{ value: 0, recorded_at: new Date().toISOString() }]);
        setBatchKey(uuidv4()); // fresh key for the next batch
        setIsExpanded(false);
        onSuccess?.();
      }
    } catch (error) {
      // Error is displayed via mutation.error — the batchKey is preserved
      // so the user can safely retry with the same key.
      console.error('Ingestion failed:', error);
    }
  };

  const totalValue = readings.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Submit Readings</h3>
          <svg
            className={`h-5 w-5 text-gray-600 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-6">
          {/* Error message with Retry button — demonstrates UX resilience.
              The retry reuses the same batch_key so the backend can safely
              deduplicate if the first request actually went through. */}
          {mutation.error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">Submission failed</p>
              <p className="mt-1">
                {typeof mutation.error === 'object'
                  ? (mutation.error as any).error?.message ||
                    'Network error — the batch has been preserved for safe retry.'
                  : 'Network error — the batch has been preserved for safe retry.'}
              </p>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={mutation.isPending}
                className="mt-3 rounded bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-400"
              >
                {mutation.isPending ? 'Retrying...' : 'Retry Submission'}
              </button>
              <p className="mt-2 text-xs text-red-600">
                Safe to retry — the same batch key is reused to prevent double-counting.
              </p>
            </div>
          )}

          {/* Duplicate detection feedback — shown when backend identifies a retry */}
          {lastResult?.duplicate && (
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
              <p className="font-semibold">Duplicate batch detected</p>
              <p className="mt-1">
                This batch was already processed ({lastResult.readings_processed}{' '}
                readings). No data was double-counted.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLastResult(null);
                  setBatchKey(uuidv4());
                }}
                className="mt-2 text-sm text-yellow-700 underline hover:text-yellow-900"
              >
                Dismiss and start a new batch
              </button>
            </div>
          )}

          {/* Readings list */}
          <div className="mb-4 space-y-3">
            {readings.map((reading, index) => (
              <div key={index} className="flex gap-3">
                {/* Value input */}
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Value (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={reading.value}
                    onChange={(e) =>
                      handleUpdateReading(index, 'value', e.target.value)
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* Datetime input */}
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Recorded At
                  </label>
                  <input
                    type="datetime-local"
                    value={reading.recorded_at.slice(0, 16)}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      handleUpdateReading(
                        index,
                        'recorded_at',
                        date.toISOString(),
                      );
                    }}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Remove button */}
                {readings.length > 1 && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveReading(index)}
                      className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add reading button */}
          {readings.length < 100 && (
            <button
              type="button"
              onClick={handleAddReading}
              className="mb-4 text-sm text-blue-600 hover:text-blue-700"
            >
              + Add another reading
            </button>
          )}

          {/* Summary */}
          <div className="mb-4 rounded bg-gray-50 p-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Readings</p>
                <p className="font-semibold text-gray-900">{readings.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Value</p>
                <p className="font-semibold text-gray-900">
                  {totalValue.toFixed(2)} kg
                </p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="font-semibold text-gray-900">
                  {mutation.isPending ? 'Submitting...' : 'Ready'}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={mutation.isPending || readings.length === 0}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {mutation.isPending ? 'Submitting...' : 'Submit Batch'}
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
