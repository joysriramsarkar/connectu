"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Post, User } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/post-card';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/context/i18n';
import { searchPostsAndUsers } from './actions';

export function SearchComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [posts, setPosts] = useState<Post[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const { t } = useI18n();

    useEffect(() => {
        const performSearch = async () => {
            if (!searchTerm.trim()) {
                setPosts([]);
                setUsers([]);
                setHasSearched(false);
                return;
            }
            setLoading(true);
            setHasSearched(true);

            try {
                // We will use a server action to perform the search
                searchPostsAndUsers(searchTerm).then(results => {
                    if (results) {
                        // The data from server actions needs to be parsed as it's serialized
                        setPosts(JSON.parse(results.posts) as Post[]);
                        setUsers(JSON.parse(results.users) as User[]);
                    } else {
                        setPosts([]);
                        setUsers([]);
                    }
                }).catch(error => {
                    console.error("Error during search: ", error);
                    setPosts([]);
                    setUsers([]);
                });

            } catch(error) {
                console.error("Error during search: ", error);
                setPosts([]);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            // Update URL without reloading the page
            const params = new URLSearchParams(window.location.search);
            if (searchTerm) {
                params.set('q', searchTerm);
            } else {
                params.delete('q');
            }
            router.replace(`${window.location.pathname}?${params.toString()}`);
            performSearch();
        }, 500); // Debounce search for 500ms

        return () => clearTimeout(timeoutId);

    }, [searchTerm, router]);

    const renderWelcomeMessage = () => (
        <div className="text-center py-16 text-muted-foreground">
            <SearchIcon className="mx-auto h-12 w-12 mb-4" />
            <h2 className="text-xl font-semibold">{t('search_posts_or_users')}</h2>
            <p>{t('find_your_favorite_content')}</p>
        </div>
    );

    return (
        <div className="p-4 md:p-6">
            <div className="relative mb-6">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder={t('search_posts_or_users') + '...'}
                    className="pl-10 text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                 <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-16 w-16 animate-spin" />
                </div>
            ) : !hasSearched ? (
                renderWelcomeMessage()
            ) : (
                <Tabs defaultValue="posts" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="posts">{t('posts')} ({posts.length})</TabsTrigger>
                        <TabsTrigger value="users">{t('users_tab')} ({users.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="posts" className="mt-4 space-y-4">
                        {posts.length > 0 ? (
                            posts.map(post => <PostCard key={post.id} post={post} />)
                        ) : (
                            <div className="text-center py-16 text-muted-foreground">
                                <p>&quot;{searchTerm}&quot; {t('no_posts_found_for')}</p>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="users" className="mt-4 space-y-4">
                       {users.length > 0 ? (
                           users.map(user => (
                               <Card key={user.id}>
                                   <CardContent className="p-4 flex items-center justify-between">
                                        <Link href={`/profile/${user.id}`} className="flex items-center gap-4 overflow-hidden">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div className="overflow-hidden">
                                                <p className="font-bold truncate">{user.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">@{user.handle}</p>
                                            </div>
                                        </Link>
                                        <Link href={`/profile/${user.id}`}>
                                            <Button variant="outline">{t('view_profile')}</Button>
                                        </Link>
                                   </CardContent>
                               </Card>
                           ))
                       ) : (
                            <div className="text-center py-16 text-muted-foreground">
                                <p>&quot;{searchTerm}&quot; {t('no_users_found_for')}</p>
                            </div>
                       )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}