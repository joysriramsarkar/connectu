'use server';

import { query } from '@/lib/neon';
import { Post, User } from '@/lib/data';

export async function searchPostsAndUsers(searchTerm: string) {
  if (!searchTerm.trim()) {
    return { posts: '[]', users: '[]' };
  }

  try {
    const pattern = `%${searchTerm.trim()}%`;
    const usersResult = await query<User>(
      `SELECT id, name, handle, avatar, cover_photo AS "coverPhoto", bio, followers, following
       FROM users WHERE name ILIKE $1 OR handle ILIKE $1 ORDER BY name LIMIT 20`,
      [pattern],
    );
    const postsResult = await query<Post>(
      `SELECT p.id, p.author_id AS "authorId", p.content, p.image, p.likes, p.comments,
              p.created_at AS "createdAt",
              json_build_object('id', u.id, 'name', u.name, 'handle', u.handle, 'avatar', u.avatar,
                'coverPhoto', u.cover_photo, 'bio', u.bio, 'followers', u.followers, 'following', u.following) AS author
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.content ILIKE $1 ORDER BY p.created_at DESC LIMIT 20`,
      [pattern],
    );
    return {
      posts: JSON.stringify(postsResult.rows),
      users: JSON.stringify(usersResult.rows),
    };
  } catch (error) {
    console.error('Search failed:', error);
    return { posts: '[]', users: '[]' };
  }
}
