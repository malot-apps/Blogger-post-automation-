'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  AlertCircle,
  BarChart3,
  ExternalLink,
  FileText,
  FolderOpen,
  PenSquare,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
import type { StoredPublishedPost } from '@/src/lib/firebase';
import type { BloggerBlog } from '@/src/server/bloggerService';
import {
  computeDashboardMetrics,
  splitPostLabels,
  type MetricsRange,
} from '@/src/lib/postMetrics';

interface PostPerformanceDashboardProps {
  posts: StoredPublishedPost[];
  blogs: BloggerBlog[];
  selectedBlogId: string;
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onCreatePost?: () => void;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}

function TimelineTooltip({ active, payload, label }: CustomChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as
    | { count?: number; cumulative?: number; label?: string }
    | undefined;
  const displayLabel = point?.label || label || '';
  const count = Number(point?.count ?? payload[0]?.value ?? 0);
  const cumulative =
    typeof point?.cumulative === 'number' ? point.cumulative : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-slate-900 mb-1">{displayLabel}</p>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        <span>Published</span>
        <span className="font-semibold text-orange-600 tabular-nums">{count}</span>
      </div>
      {cumulative !== null && (
        <div className="flex items-center justify-between gap-4 text-slate-500 mt-0.5">
          <span>Cumulative</span>
          <span className="font-medium text-slate-800 tabular-nums">{cumulative}</span>
        </div>
      )}
    </div>
  );
}

function BreakdownTooltip({ active, payload }: CustomChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as
    | { blogName?: string; label?: string; bloggerTotalCount?: number; trackedCount?: number; count?: number }
    | undefined;
  const title = row?.blogName || row?.label || '';

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs max-w-[220px]">
      <p className="font-semibold text-slate-900 truncate mb-1">{title}</p>
      {payload.map((entry, idx) => (
        <div
          key={entry.dataKey || idx}
          className="flex items-center justify-between gap-4 text-slate-600 mt-0.5"
        >
          <span>{entry.name}</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {Number(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return 'Recently';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Recently';
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const TOPIC_COLORS = ['#ea580c', '#f97316', '#4f46e5', '#0284c7', '#059669', '#64748b'];

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function PostPerformanceDashboard({
  posts,
  blogs,
  selectedBlogId,
  isLoading,
  error,
  onRefresh,
  onCreatePost,
}: PostPerformanceDashboardProps) {
  const [range, setRange] = useState<MetricsRange>('30d');
  const [blogFilter, setBlogFilter] = useState<string>('all');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [breakdownTab, setBreakdownTab] = useState<'blogs' | 'labels'>('blogs');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [failedThumbIds, setFailedThumbIds] = useState<Record<string, boolean>>({});
  const hasMounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  // Keep blogFilter valid if blog list changes
  const effectiveBlogFilter = useMemo(() => {
    if (blogFilter === 'all') return 'all';
    const existsInBlogs = blogs.some((b) => b.id === blogFilter);
    const existsInPosts = posts.some((p) => p.blogId === blogFilter);
    return existsInBlogs || existsInPosts ? blogFilter : 'all';
  }, [blogFilter, blogs, posts]);

  const metrics = useMemo(
    () => computeDashboardMetrics(posts, blogs, effectiveBlogFilter, range),
    [posts, blogs, effectiveBlogFilter, range]
  );

  const blogNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of blogs) {
      map.set(b.id, b.name);
    }
    return map;
  }, [blogs]);

  const searchedHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return metrics.filteredPosts;
    return metrics.filteredPosts.filter((post) => {
      const blogName = (blogNameById.get(post.blogId) || '').toLowerCase();
      return (
        (post.title || '').toLowerCase().includes(q) ||
        (post.caption || '').toLowerCase().includes(q) ||
        (post.labels || '').toLowerCase().includes(q) ||
        blogName.includes(q)
      );
    });
  }, [metrics.filteredPosts, searchQuery, blogNameById]);

  const visibleHistory = showAllHistory ? searchedHistory : searchedHistory.slice(0, 10);

  const topLabelName = metrics.labelDistribution[0]?.label || null;
  const activeScopeLabel =
    effectiveBlogFilter === 'all'
      ? `All connected blogs (${blogs.length})`
      : blogNameById.get(effectiveBlogFilter) || 'Selected blog';

  const hasAnyGlobalData = posts.length > 0 || blogs.some((b) => (b.posts?.totalItems ?? 0) > 0);

  // Loading Skeleton (initial load with no cached data)
  if (isLoading && posts.length === 0 && blogs.length === 0) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
        <div className="bg-white border border-slate-200 rounded-xl p-4 h-16" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl h-80" />
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl h-80" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl h-64" />
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Post Performance Dashboard">
      {/* Top Toolbar & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-orange-600 shrink-0" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Post Performance &amp; History
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {activeScopeLabel} · {metrics.summary.trackedCount} tracked in range
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Blog Filter */}
          <select
            value={effectiveBlogFilter}
            onChange={(e) => {
              setBlogFilter(e.target.value);
              setShowAllHistory(false);
            }}
            aria-label="Filter metrics by blog"
            className="text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 max-w-[190px] truncate"
          >
            <option value="all">All Blogs ({blogs.length})</option>
            {blogs.map((blog) => (
              <option key={blog.id} value={blog.id}>
                {blog.name}
                {blog.id === selectedBlogId ? ' (Active)' : ''}
              </option>
            ))}
          </select>

          {/* Timeframe Switcher */}
          <div
            className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5"
            role="group"
            aria-label="Timeframe filter"
          >
            {(
              [
                { key: '7d', label: '7 Days' },
                { key: '30d', label: '30 Days' },
                { key: 'all', label: 'All Time' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setRange(opt.key);
                  setShowAllHistory(false);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === opt.key
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Inline Error Banner (if Firestore history read failed) */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-800"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to load full publication history</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="self-start sm:self-center px-3 py-1.5 bg-white hover:bg-red-100/70 text-red-700 font-semibold border border-red-200 rounded-lg transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Global Empty State (no tracked posts AND zero Blogger posts across blogs) */}
      {!isLoading && !error && !hasAnyGlobalData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900">No published posts tracked yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Publish your first article using the Composer or import existing Blogger articles to populate publication counts, trend charts, and recent history.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2">
            {onCreatePost && (
              <button
                type="button"
                onClick={onCreatePost}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Compose First Post</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Again</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Strip (4 flat single-elevation cells, strict tabular numerals) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">Blogger Total Posts</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                {metrics.summary.bloggerTotalCount.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 tabular-nums truncate">
                {effectiveBlogFilter === 'all'
                  ? `Across ${metrics.summary.activeBlogsCount} connected blog${metrics.summary.activeBlogsCount === 1 ? '' : 's'}`
                  : activeScopeLabel}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">Tracked Publications</p>
              <p className="mt-1.5 text-2xl font-bold text-orange-600 tabular-nums">
                {metrics.summary.trackedCount.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                30d: {metrics.summary.last30DaysCount} · All: {metrics.summary.allTimeTrackedCount}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">Published Last 7 Days</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                {metrics.summary.last7DaysCount.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 tabular-nums truncate">
                Latest: {formatShortDate(metrics.summary.latestPublishedAt)}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">Unique Labels Used</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                {metrics.summary.uniqueLabelsCount.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                {topLabelName ? `Top: ${topLabelName}` : 'No labels in range'}
              </p>
            </div>
          </div>

          {/* Primary Visualization Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Publication Activity Timeline */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span>Publication Activity</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {range === '7d'
                      ? 'Daily posts over the last 7 days'
                      : range === '30d'
                        ? 'Daily posts over the last 30 days'
                        : 'Historical publishing cadence'}
                  </p>
                </div>

                <div
                  className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5"
                  role="group"
                  aria-label="Timeline chart type"
                >
                  <button
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      chartType === 'area'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Area
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      chartType === 'bar'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bar
                  </button>
                </div>
              </div>

              <div className="h-[240px] w-full min-w-0">
                {!hasMounted ? (
                  <div className="h-full w-full rounded-lg bg-slate-50 animate-pulse" />
                ) : metrics.timeline.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <p className="text-xs font-medium text-slate-600">
                      No tracked publication timestamps in this period
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Posts published through this studio will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    {chartType === 'area' ? (
                      <AreaChart
                        data={metrics.timeline}
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="publishAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          minTickGap={22}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <Tooltip content={<TimelineTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Published"
                          stroke="#ea580c"
                          strokeWidth={2}
                          fill="url(#publishAreaFill)"
                          activeDot={{ r: 4, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart
                        data={metrics.timeline}
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          minTickGap={22}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <Tooltip content={<TimelineTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar
                          dataKey="count"
                          name="Published"
                          fill="#ea580c"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Right: Blog & Topic Breakdown */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Distribution Breakdown</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {breakdownTab === 'blogs'
                      ? 'Blogger live count vs. tracked posts'
                      : 'Most frequently assigned labels'}
                  </p>
                </div>

                <div
                  className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5"
                  role="group"
                  aria-label="Breakdown dimension"
                >
                  <button
                    type="button"
                    onClick={() => setBreakdownTab('blogs')}
                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      breakdownTab === 'blogs'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Blog
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakdownTab('labels')}
                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      breakdownTab === 'labels'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Top Labels
                  </button>
                </div>
              </div>

              <div className="h-[240px] w-full min-w-0">
                {!hasMounted ? (
                  <div className="h-full w-full rounded-lg bg-slate-50 animate-pulse" />
                ) : breakdownTab === 'blogs' ? (
                  metrics.blogDistribution.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No connected blogs available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={metrics.blogDistribution.slice(0, 6)}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="blogName"
                          width={105}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#334155' }}
                        />
                        <Tooltip content={<BreakdownTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar
                          dataKey="bloggerTotalCount"
                          name="Blogger Total"
                          fill="#94a3b8"
                          radius={[0, 4, 4, 0]}
                          barSize={10}
                        />
                        <Bar
                          dataKey="trackedCount"
                          name="App Tracked"
                          fill="#ea580c"
                          radius={[0, 4, 4, 0]}
                          barSize={10}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : metrics.labelDistribution.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <p className="text-xs font-medium text-slate-600">
                      No labels recorded in this range
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Add comma-separated labels when publishing posts to track topic coverage.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={metrics.labelDistribution}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={105}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#334155' }}
                      />
                      <Tooltip content={<BreakdownTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="count" name="Posts" radius={[0, 4, 4, 0]} barSize={14}>
                        {metrics.labelDistribution.map((entry, idx) => (
                          <Cell
                            key={entry.label}
                            fill={TOPIC_COLORS[idx % TOPIC_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {breakdownTab === 'blogs' && metrics.blogDistribution.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
                    <span>Blogger Total</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-orange-600 inline-block" />
                    <span>App Tracked ({range === 'all' ? 'All' : range})</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Publication History Feed / Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Publication History</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  Showing {visibleHistory.length} of {searchedHistory.length} matching post
                  {searchedHistory.length === 1 ? '' : 's'}
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowAllHistory(false);
                  }}
                  placeholder="Search title, label, blog..."
                  aria-label="Search publication history"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
              </div>
            </div>

            {searchedHistory.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <FileText className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-700">
                  {metrics.filteredPosts.length === 0
                    ? 'No tracked posts in the selected blog or date range'
                    : 'No posts match your search query'}
                </p>
                <div className="pt-1 flex items-center justify-center gap-2">
                  {(searchQuery || effectiveBlogFilter !== 'all' || range !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setBlogFilter('all');
                        setRange('all');
                      }}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700 underline"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {visibleHistory.map((post) => {
                    const blogName =
                      blogNameById.get(post.blogId) || `Blog ${post.blogId.slice(0, 6)}…`;
                    const parsedLabels = splitPostLabels(post.labels);
                    const showThumb = Boolean(post.thumbnailUrl && !failedThumbIds[post.id]);

                    return (
                      <div
                        key={post.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          {showThumb ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={post.thumbnailUrl}
                              alt={post.title || 'Post thumbnail'}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedThumbIds((prev) => ({ ...prev, [post.id]: true }))
                              }
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {post.title || 'Untitled Post'}
                            </p>
                            {post.caption && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {post.caption}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-500 mt-1 tabular-nums truncate">
                              <span className="font-medium text-slate-700">{blogName}</span>
                              <span> · {formatDateTime(post.publishedAt)}</span>
                              {parsedLabels.length > 0 && (
                                <span className="text-slate-500">
                                  {' · '}
                                  {parsedLabels.slice(0, 3).join(', ')}
                                  {parsedLabels.length > 3 ? ` +${parsedLabels.length - 3}` : ''}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-slate-200 rounded-lg transition-colors"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>

                {searchedHistory.length > 10 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllHistory((prev) => !prev)}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                    >
                      {showAllHistory
                        ? 'Show recent 10 only'
                        : `Show all ${searchedHistory.length} posts`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
