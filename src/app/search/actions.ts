'use server';

import clientPromise from '@/lib/mongodb';
import { Post, User } from '@/lib/data';
import { ObjectId } from 'mongodb';

export async function searchPostsAndUsers(searchTerm: string) {
  if (!searchTerm.trim()) {
    return { posts: '[]', users: '[]' };
  }

  try {
    const client = await clientPromise;
    const db = client.db(); // Use your database name if you have one, otherwise it uses the default from the connection string.

    const searchTermLower = searchTerm.toLowerCase();

    // Search for users by name OR handle using a case-insensitive regex
    const usersCursor = db.collection<User>('users').find({
      $or: [
        { name_lowercase: { $regex: searchTermLower, $options: 'i' } },
        { handle: { $regex: searchTermLower, $options: 'i' } },
      ],
    });
    const users = await usersCursor.toArray();

    // Search for posts using a text index for better performance.
    // NOTE: You need to create a text index on the 'content' field in your 'posts' collection in MongoDB Atlas.
    // db.posts.createIndex({ content: "text" })
    const postsWithAuthors = await db.collection('posts').aggregate<Post>([
        {
            $search: {
                index: 'default', // Or your specific search index name
                text: {
                    query: searchTerm,
                    path: {
                        'wildcard': '*'
                    }
                }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'authorId',
                foreignField: '_id', // Assuming authorId stores ObjectId of the user
                as: 'author'
            }
        },
        { $unwind: '$author' } // Convert author array to a single object
    ]).toArray();

    // Convert ObjectId to string for serialization
    const serialize = (data: any[]) => JSON.stringify(data.map(d => ({ ...d, _id: d._id.toString(), id: d._id.toString() })));

    return { posts: serialize(postsWithAuthors), users: serialize(users) };
  } catch (error) {
    console.error('Search failed:', error);
    return { posts: '[]', users: '[]' };
  }
}