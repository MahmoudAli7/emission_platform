'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useSiteReadings } from '@/lib/api';

interface EmissionsChartProps {
  siteId: string;
  emissionLimit: number;
}

export function EmissionsChart({ siteId, emissionLimit }: EmissionsChartProps) {
  const { data: readings, isLoading, error } = useSiteReadings(siteId);

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-gray-200 bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !readings) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
        Failed to load chart data
      </div>
    );
  }

  if (readings.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
        No readings yet. Submit data via the ingestion form below.
      </div>
    );
  }

  // Build cumulative data for the chart
  const chartData = readings.reduce(
    (acc, reading) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      const value = parseFloat(reading.value);
      acc.push({
        date: new Date(reading.recorded_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: new Date(reading.recorded_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        value,
        cumulative: prev + value,
      });
      return acc;
    },
    [] as { date: string; fullDate: string; value: number; cumulative: number }[],
  );

  const maxValue = Math.max(
    ...chartData.map((d) => d.cumulative),
    emissionLimit * 1.1,
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Emissions Over Time
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={[0, Math.ceil(maxValue)]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString()
            }
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <p className="text-xs font-medium text-gray-500">
                    {data.fullDate}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-gray-600">Reading: </span>
                    <span className="font-semibold text-blue-600">
                      {data.value.toFixed(2)} kg
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">Cumulative: </span>
                    <span className="font-semibold text-gray-900">
                      {data.cumulative.toFixed(2)} kg
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={emissionLimit}
            stroke="#ef4444"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `Limit: ${emissionLimit.toLocaleString()} kg`,
              position: 'insideTopRight',
              fill: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 5, fill: '#2563eb' }}
            name="Cumulative Emissions"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-gray-500">
        Cumulative emissions over {chartData.length} readings
      </p>
    </div>
  );
}

