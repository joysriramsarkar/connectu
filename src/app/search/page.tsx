import { Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import { SearchComponent } from './search-component';

function SearchPageFallback() {
    return (
        <div className="p-4 md:p-6">
            <div className="relative mb-6">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search posts or users..." className="pl-10 text-lg" disabled />
            </div>
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        </div>
    );
}

export default function SearchPage() {
    return <Suspense fallback={<SearchPageFallback />}><SearchComponent /></Suspense>;
}
