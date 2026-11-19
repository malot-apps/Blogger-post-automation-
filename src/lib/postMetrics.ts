import type { StoredPublishedPost } from './firebase';
import type { BloggerBlog } from '../server/bloggerService';

export type MetricsRange = '7d' | '30d' | 'all';

export interface TimelinePoint {
  dateKey: string;
  label: string;
  count: number;
  cumulative: number;
}

export interface BlogMetricPoint {
  blogId: string;
  blogName: string;
  trackedCount: number;
  bloggerTotalCount: number;
}

export interface LabelMetricPoint {
  label: string;
  count: number;
}

export interface DashboardSummary {
  bloggerTotalCount: number;
  trackedCount: number;
  allTimeTrackedCount: number;
  last7DaysCount: number;
  last30DaysCount: number;
  activeBlogsCount: number;
  uniqueLabelsCount: number;
  latestPublishedAt: string | null;
}

export interface ComputedDashboardMetrics {
  summary: DashboardSummary;
  filteredPosts: StoredPublishedPost[];
  timeline: TimelinePoint[];
  blogDistribution: BlogMetricPoint[];
  labelDistribution: LabelMetricPoint[];
}

function parseTimestamp(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getRangeCutoff(range: MetricsRange, now: Date): Date | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return cutoff;
}

export function splitPostLabels(labels?: string | string[]): string[] {
  if (!labels) return [];
  const rawList = Array.isArray(labels) ? labels : String(labels).split(',');
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of rawList) {
    const trimmed = String(item).trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    cleaned.push(trimmed);
  }
  return cleaned;
}

export function filterPostsByBlogAndRange(
  posts: StoredPublishedPost[],
  blogFilter: string,
  range: MetricsRange,
  now: Date = new Date()
): StoredPublishedPost[] {
  const cutoff = getRangeCutoff(range, now);
  const cutoffMs = cutoff ? cutoff.getTime() : null;

  return posts
    .filter((post) => {
      if (blogFilter !== 'all' && post.blogId !== blogFilter) return false;
      if (cutoffMs !== null) {
        const dt = parseTimestamp(post.publishedAt);
        if (!dt) return false;
        const dayStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
        if (dayStart < cutoffMs) return false;
      }
      return true;
    })
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}

export function buildPublicationTimeline(
  posts: StoredPublishedPost[],
  range: MetricsRange,
  now: Date = new Date()
): TimelinePoint[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === '7d' || range === '30d') {
    const dayCount = range === '7d' ? 7 : 30;
    const countsByDay = new Map<string, number>();

    for (const post of posts) {
      const dt = parseTimestamp(post.publishedAt);
      if (!dt) continue;
      const key = toLocalDayKey(dt);
      countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    }

    const series: TimelinePoint[] = [];
    let runningTotal = 0;

    for (let offset = dayCount - 1; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const key = toLocalDayKey(d);
      const count = countsByDay.get(key) || 0;
      runningTotal += count;
      series.push({
        dateKey: key,
        label: formatDayLabel(key),
        count,
        cumulative: runningTotal,
      });
    }
    return series;
  }

  // 'all' time range
  const datedPosts = posts
    .map((p) => ({ post: p, dt: parseTimestamp(p.publishedAt) }))
    .filter((item): item is { post: StoredPublishedPost; dt: Date } => item.dt !== null);

  if (datedPosts.length === 0) {
    return [];
  }

  let earliestTime = datedPosts[0].dt.getTime();
  for (const item of datedPosts) {
    if (item.dt.getTime() < earliestTime) {
      earliestTime = item.dt.getTime();
    }
  }

  const earliestDate = new Date(earliestTime);
  const earliestDay = new Date(
    earliestDate.getFullYear(),
    earliestDate.getMonth(),
    earliestDate.getDate()
  );
  const spanDays = Math.max(
    1,
    Math.round((today.getTime() - earliestDay.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );

  if (spanDays <= 45) {
    const totalDays = Math.max(spanDays, 7);
    const countsByDay = new Map<string, number>();
    for (const { dt } of datedPosts) {
      const key = toLocalDayKey(dt);
      countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    }

    const series: TimelinePoint[] = [];
    let runningTotal = 0;
    for (let offset = totalDays - 1; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const key = toLocalDayKey(d);
      const count = countsByDay.get(key) || 0;
      runningTotal += count;
      series.push({
        dateKey: key,
        label: formatDayLabel(key),
        count,
        cumulative: runningTotal,
      });
    }
    return series;
  }

  // Monthly grouping for spans > 45 days
  const countsByMonth = new Map<string, number>();
  for (const { dt } of datedPosts) {
    const key = toMonthKey(dt);
    countsByMonth.set(key, (countsByMonth.get(key) || 0) + 1);
  }

  const series: TimelinePoint[] = [];
  let runningTotal = 0;
  const cursor = new Date(earliestDay.getFullYear(), earliestDay.getMonth(), 1);
  const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  while (cursor.getTime() <= endMonth.getTime()) {
    const key = toMonthKey(cursor);
    const count = countsByMonth.get(key) || 0;
    runningTotal += count;
    series.push({
      dateKey: key,
      label: formatMonthLabel(key),
      count,
      cumulative: runningTotal,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return series;
}

export function buildBlogDistribution(
  posts: StoredPublishedPost[],
  blogs: BloggerBlog[],
  blogFilter: string = 'all'
): BlogMetricPoint[] {
  const countsByBlog = new Map<string, number>();
  for (const post of posts) {
    if (!post.blogId) continue;
    countsByBlog.set(post.blogId, (countsByBlog.get(post.blogId) || 0) + 1);
  }

  const blogMap = new Map<string, BlogMetricPoint>();

  for (const blog of blogs) {
    if (blogFilter !== 'all' && blog.id !== blogFilter) continue;
    blogMap.set(blog.id, {
      blogId: blog.id,
      blogName: blog.name || 'Untitled Blog',
      trackedCount: countsByBlog.get(blog.id) || 0,
      bloggerTotalCount: Number(blog.posts?.totalItems ?? 0),
    });
  }

  for (const [blogId, trackedCount] of countsByBlog.entries()) {
    if (blogFilter !== 'all' && blogId !== blogFilter) continue;
    if (!blogMap.has(blogId)) {
      blogMap.set(blogId, {
        blogId,
        blogName: `Blog (${blogId.slice(0, 6)}…)`,
        trackedCount,
        bloggerTotalCount: trackedCount,
      });
    }
  }

  return Array.from(blogMap.values()).sort(
    (a, b) =>
      Math.max(b.bloggerTotalCount, b.trackedCount) -
      Math.max(a.bloggerTotalCount, a.trackedCount)
  );
}

export function buildLabelDistribution(
  posts: StoredPublishedPost[],
  maxItems = 8
): LabelMetricPoint[] {
  const labelCounts = new Map<string, { display: string; count: number }>();

  for (const post of posts) {
    const labels = splitPostLabels(post.labels);
    for (const label of labels) {
      const key = label.toLowerCase();
      const existing = labelCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        labelCounts.set(key, { display: label, count: 1 });
      }
    }
  }

  return Array.from(labelCounts.values())
    .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))
    .slice(0, maxItems)
    .map((entry) => ({ label: entry.display, count: entry.count }));
}

export function computeDashboardMetrics(
  posts: StoredPublishedPost[],
  blogs: BloggerBlog[],
  blogFilter: string,
  range: MetricsRange,
  now: Date = new Date()
): ComputedDashboardMetrics {
  const scopedAllTimePosts = filterPostsByBlogAndRange(posts, blogFilter, 'all', now);
  const filteredPosts = filterPostsByBlogAndRange(posts, blogFilter, range, now);
  const last7DaysPosts = filterPostsByBlogAndRange(posts, blogFilter, '7d', now);
  const last30DaysPosts = filterPostsByBlogAndRange(posts, blogFilter, '30d', now);

  const timeline = buildPublicationTimeline(filteredPosts, range, now);
  const blogDistribution = buildBlogDistribution(filteredPosts, blogs, blogFilter);
  const labelDistribution = buildLabelDistribution(filteredPosts, 8);

  const relevantBlogs =
    blogFilter === 'all' ? blogs : blogs.filter((b) => b.id === blogFilter);
  const bloggerTotalCount = relevantBlogs.reduce(
    (sum, blog) => sum + Number(blog.posts?.totalItems ?? 0),
    0
  );

  const uniqueLabelKeys = new Set<string>();
  for (const post of filteredPosts) {
    for (const lbl of splitPostLabels(post.labels)) {
      uniqueLabelKeys.add(lbl.toLowerCase());
    }
  }

  const latestPublishedAt =
    filteredPosts[0]?.publishedAt || scopedAllTimePosts[0]?.publishedAt || null;

  return {
    summary: {
      bloggerTotalCount,
      trackedCount: filteredPosts.length,
      allTimeTrackedCount: scopedAllTimePosts.length,
      last7DaysCount: last7DaysPosts.length,
      last30DaysCount: last30DaysPosts.length,
      activeBlogsCount: blogs.length,
      uniqueLabelsCount: uniqueLabelKeys.size,
      latestPublishedAt,
    },
    filteredPosts,
    timeline,
    blogDistribution,
    labelDistribution,
  };
}
