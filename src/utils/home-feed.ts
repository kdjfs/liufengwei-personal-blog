interface HomeFeedPost {
  id: string;
  data: {
    featured?: boolean;
  };
}

export function selectHomePosts<T extends HomeFeedPost>(posts: T[], limit = 10): T[] {
  const featured = posts.filter((post) => post.data.featured);
  const regular = posts.filter((post) => !post.data.featured);
  return [...featured, ...regular].slice(0, limit);
}
