import type { BlogEntry } from './posts';

export function sortSeriesPosts(posts: BlogEntry[]): BlogEntry[] {
  return [...posts].sort((a, b) => {
    if (!Number.isInteger(a.data.seriesOrder) || !Number.isInteger(b.data.seriesOrder)) {
      throw new Error('Series posts require an explicit seriesOrder');
    }
    return a.data.seriesOrder! - b.data.seriesOrder!;
  });
}

export function getPostNavigation(current: BlogEntry, timeline: BlogEntry[]) {
  if (current.data.series) {
    const seriesPosts = sortSeriesPosts(
      timeline.filter((item) => item.data.series === current.data.series),
    );
    const seriesIndex = seriesPosts.findIndex((item) => item.id === current.id);
    return {
      previous: seriesIndex > 0 ? seriesPosts[seriesIndex - 1] : undefined,
      next: seriesIndex >= 0 ? seriesPosts[seriesIndex + 1] : undefined,
      seriesPosts,
      seriesPosition: seriesIndex >= 0 ? seriesIndex + 1 : undefined,
      seriesTotal: seriesPosts.length,
    };
  }

  const index = timeline.findIndex((item) => item.id === current.id);
  return {
    previous: timeline[index + 1],
    next: timeline[index - 1],
    seriesPosts: [],
    seriesPosition: undefined,
    seriesTotal: 0,
  };
}
