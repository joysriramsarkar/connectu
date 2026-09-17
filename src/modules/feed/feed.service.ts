/**
 * Feed Service — server-side only.
 *
 * Provides:
 * 1. getFollowingFeed: posts from accounts the viewer follows + own posts
 * 2. getExploreFeed: public discovery feed with block filtering
 */

import { query } from "@/lib/neon";

export interface FeedPost {
  id: string;
  authorId: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  createdAt: string;
  isLiked: boolean;
  author: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    coverPhoto: string;
    bio: string;
    followers: number;
    following: number;
  };
}

export interface FeedPage {
  posts: FeedPost[];
  nextCursor: string | null;
}

const PAGE_SIZE = 20;

/**
 * Builds the following feed for `viewerId`.
 * Cursor format: `<ISO timestamp>__<postId>`
 */
export async function getFollowingFeed(
  viewerId: string,
  cursor?: string,
): Promise<FeedPage> {
  let cursorTs: string | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const parts = cursor.split("__");
    if (parts.length === 2) {
      cursorTs = parts[0];
      cursorId = parts[1];
    }
  }

  const feedResult = await query<{
    id: string;
    author_id: string;
    content: string;
    image: string | null;
    likes: number;
    comments: number;
    created_at: Date;
    is_liked: boolean;
  }>(
    `
    SELECT
      p.id,
      p.author_id,
      p.content,
      p.image,
      p.likes,
      p.comments,
      p.created_at,
      EXISTS (
        SELECT 1 FROM likes l
        WHERE l.post_id = p.id AND l.user_id = $1
      ) AS is_liked
    FROM posts p
    WHERE (
      p.author_id = $1
      OR p.author_id IN (
        SELECT following_id FROM follows WHERE follower_id = $1
      )
    )
    AND p.status = 'active'
    AND p.author_id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id = $1
      UNION
      SELECT blocker_id FROM blocks WHERE blocked_id = $1
    )
    AND p.author_id NOT IN (
      SELECT muted_id FROM mutes WHERE muter_id = $1
    )
    AND (
      p.visibility = 'public'
      OR p.author_id = $1
      OR (
        p.visibility = 'followers'
        AND p.author_id IN (
          SELECT following_id FROM follows WHERE follower_id = $1
        )
      )
    )
    AND (
      $2::TIMESTAMPTZ IS NULL
      OR (p.created_at, p.id::TEXT) < ($2::TIMESTAMPTZ, $3::TEXT)
    )
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $4
    `,
    [viewerId, cursorTs, cursorId, PAGE_SIZE + 1],
  );

  return formatFeedPage(feedResult.rows);
}

/**
 * Builds the explore/discovery feed (all active public posts).
 */
export async function getExploreFeed(
  viewerId?: string | null,
  cursor?: string,
): Promise<FeedPage> {
  let cursorTs: string | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const parts = cursor.split("__");
    if (parts.length === 2) {
      cursorTs = parts[0];
      cursorId = parts[1];
    }
  }

  const queryParams: any[] = [viewerId || null, cursorTs, cursorId, PAGE_SIZE + 1];
  let blockFilter = "";
  if (viewerId) {
    blockFilter = `
      AND p.author_id NOT IN (
        SELECT blocked_id FROM blocks WHERE blocker_id = $1
        UNION
        SELECT blocker_id FROM blocks WHERE blocked_id = $1
      )
      AND p.author_id NOT IN (
        SELECT muted_id FROM mutes WHERE muter_id = $1
      )
    `;
  }

  const feedResult = await query<{
    id: string;
    author_id: string;
    content: string;
    image: string | null;
    likes: number;
    comments: number;
    created_at: Date;
    is_liked: boolean;
  }>(
    `
    SELECT
      p.id,
      p.author_id,
      p.content,
      p.image,
      p.likes,
      p.comments,
      p.created_at,
      CASE WHEN $1::TEXT IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM likes l
          WHERE l.post_id = p.id AND l.user_id = $1
        )
      ELSE FALSE END AS is_liked
    FROM posts p
    WHERE p.status = 'active'
      AND p.visibility = 'public'
      ${blockFilter}
      AND (
        $2::TIMESTAMPTZ IS NULL
        OR (p.created_at, p.id::TEXT) < ($2::TIMESTAMPTZ, $3::TEXT)
      )
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $4
    `,
    queryParams,
  );

  return formatFeedPage(feedResult.rows);
}

async function formatFeedPage(rows: Array<{
  id: string;
  author_id: string;
  content: string;
  image: string | null;
  likes: number;
  comments: number;
  created_at: Date;
  is_liked: boolean;
}>): Promise<FeedPage> {
  const hasNextPage = rows.length > PAGE_SIZE;
  const posts = hasNextPage ? rows.slice(0, PAGE_SIZE) : rows;

  if (posts.length === 0) {
    return { posts: [], nextCursor: null };
  }

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const authorsResult = await query<{
    id: string;
    name: string;
    handle: string;
    avatar: string;
    cover_photo: string;
    bio: string;
    followers: number;
    following: number;
  }>(
    `SELECT id, name, handle, avatar, cover_photo, bio, followers, following
     FROM users WHERE id = ANY($1::TEXT[])`,
    [authorIds],
  );

  const authorMap = new Map(authorsResult.rows.map((u) => [u.id, u]));

  const feedPosts: FeedPost[] = posts
    .map((p): FeedPost | null => {
      const author = authorMap.get(p.author_id);
      if (!author) return null;
      const post: FeedPost = {
        id: p.id,
        authorId: p.author_id,
        content: p.content,
        likes: p.likes,
        comments: p.comments,
        createdAt: p.created_at.toISOString(),
        isLiked: p.is_liked,
        author: {
          id: author.id,
          name: author.name,
          handle: author.handle,
          avatar: author.avatar,
          coverPhoto: author.cover_photo,
          bio: author.bio,
          followers: author.followers,
          following: author.following,
        },
      };
      if (p.image) post.image = p.image;
      return post;
    })
    .filter((p): p is FeedPost => p !== null);

  const lastPost = posts[posts.length - 1];
  const nextCursor = hasNextPage
    ? `${new Date(lastPost.created_at).toISOString()}__${lastPost.id}`
    : null;

  return { posts: feedPosts, nextCursor };
}
