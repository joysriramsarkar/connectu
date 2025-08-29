import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { mockPosts, mockUsers } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const suggestedUsers = mockUsers.slice(2, 6);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
      <div className="md:col-span-2 xl:col-span-3 space-y-6">
        <CreatePost />
        <div className="space-y-4">
          {mockPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
      <aside className="hidden md:block md:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>আপনার জন্য পরামর্শ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between">
                <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">@{user.handle}</p>
                  </div>
                </Link>
                <Button size="sm" variant="outline">অনুসরণ করুন</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
