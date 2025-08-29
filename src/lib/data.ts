
export type User = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  'data-ai-hint'?: string;
  coverPhoto: string;
  bio: string;
  followers: number;
  following: number;
};

export type Post = {
  id: string;
  author: User;
  content: string;
  image?: string;
  'data-ai-hint'?: string;
  likes: number;
  comments: number;
  createdAt: string;
};

export type Message = {
  id: string;
  sender: User;
  content: string;
  timestamp: string;
}

export type Conversation = {
  id: string;
  participant: User;
  messages: Message[];
  lastMessage: string;
  lastMessageTimestamp: string;
}

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'আকাশ আহমেদ',
    handle: 'akash_ahmed',
    avatar: 'https://picsum.photos/seed/user1/200',
    'data-ai-hint': 'man portrait',
    coverPhoto: 'https://picsum.photos/seed/cover1/1200/400',
    bio: 'প্রযুক্তি এবং ভ্রমণ ভালোবাসি। নতুন কিছু শিখতে এবং শেখাতে পছন্দ করি।',
    followers: 1250,
    following: 320,
  },
  {
    id: 'user-2',
    name: 'জান্নাতুল ফেরদৌস',
    handle: 'jannatul_f',
    avatar: 'https://picsum.photos/seed/user2/200',
    'data-ai-hint': 'woman portrait',
    coverPhoto: 'https://picsum.photos/seed/cover2/1200/400',
    bio: 'একজন শিল্পী এবং বইপ্রেমী। রঙ এবং শব্দ দিয়ে জগৎ আঁকি।',
    followers: 2800,
    following: 450,
  },
  {
    id: 'user-3',
    name: 'সোহান চৌধুরী',
    handle: 'sohan_chy',
    avatar: 'https://picsum.photos/seed/user3/200',
    'data-ai-hint': 'smiling man',
    coverPhoto: 'https://picsum.photos/seed/cover3/1200/400',
    bio: 'উদ্যোক্তা। স্টার্টআপ এবং ইনোভেশন নিয়ে কাজ করি।',
    followers: 5300,
    following: 150,
  },
  {
    id: 'user-4',
    name: 'ফারিয়া ইসলাম',
    handle: 'faria_islam',
    avatar: 'https://picsum.photos/seed/user4/200',
    'data-ai-hint': 'woman nature',
    coverPhoto: 'https://picsum.photos/seed/cover4/1200/400',
    bio: 'বিশ্ব ভ্রমণকারী এবং ফটোগ্রাফার। ক্যামেরার চোখে পৃথিবী দেখি।',
    followers: 10200,
    following: 25,
  },
  {
    id: 'user-5',
    name: 'রায়হান কবির',
    handle: 'rayhan_kabir',
    avatar: 'https://picsum.photos/seed/user5/200',
    'data-ai-hint': 'man thinking',
    coverPhoto: 'https://picsum.photos/seed/cover5/1200/400',
    bio: 'ডেভেলপার এবং ওপেন সোর্স উত্সাহী। কোড দিয়ে সমস্যার সমাধান করি।',
    followers: 850,
    following: 500,
  },
];

export const mockPosts: Post[] = [
  {
    id: 'post-1',
    author: mockUsers[1],
    content: 'আজকের सूर्यास्त অসাধারণ ছিল! প্রকৃতির সৌন্দর্য সত্যিই মন মুগ্ধকর। 🌅 #প্রকৃতি #শান্তি',
    image: 'https://picsum.photos/seed/post1/600/400',
    'data-ai-hint': 'sunset beach',
    likes: 152,
    comments: 12,
    createdAt: '২ ঘন্টা আগে',
  },
  {
    id: 'post-2',
    author: mockUsers[0],
    content: 'আমার নতুন প্রজেক্টের জন্য কোডিং করছি। আপনাদের সবার সমর্থন চাই! 👨‍💻 #প্রোগ্রামিং #ডেভেলপমেন্ট',
    likes: 88,
    comments: 25,
    createdAt: '৫ ঘন্টা আগে',
  },
  {
    id: 'post-3',
    author: mockUsers[3],
    content: 'পাহাড়ের চূড়া থেকে তোলা একটি ছবি। এই দৃশ্য ভোলার নয়। 🏔️ #ভ্রমণ #পাহাড়',
    image: 'https://picsum.photos/seed/post3/600/800',
    'data-ai-hint': 'mountain peak',
    likes: 430,
    comments: 45,
    createdAt: '১ দিন আগে',
  },
   {
    id: 'post-4',
    author: mockUsers[2],
    content: 'নতুন বই পড়া শুরু করলাম। আপনার প্রিয় বই কোনটি? 📚 #বইপ্রেমী #পড়া',
    likes: 210,
    comments: 78,
    createdAt: '২ দিন আগে',
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    participant: mockUsers[1],
    lastMessage: 'অবশ্যই! কখন দেখা করবে?',
    lastMessageTimestamp: '১০:৩০ AM',
    messages: [
      { id: 'msg-1-1', sender: mockUsers[0], content: 'হাই, কেমন আছো?', timestamp: '১০:২৮ AM'},
      { id: 'msg-1-2', sender: mockUsers[1], content: 'এইতো ভালো, তুমি? একটা ব্যাপারে কথা ছিল।', timestamp: '১০:২৯ AM'},
      { id: 'msg-1-3', sender: mockUsers[0], content: 'হ্যাঁ, বলো।', timestamp: '১০:২৯ AM'},
      { id: 'msg-1-4', sender: mockUsers[1], content: 'অবশ্যই! কখন দেখা করবে?', timestamp: '১০:৩০ AM'},
    ],
  },
  {
    id: 'conv-2',
    participant: mockUsers[2],
    lastMessage: 'ধন্যবাদ! 😊',
    lastMessageTimestamp: 'গতকাল',
    messages: [
       { id: 'msg-2-1', sender: mockUsers[0], content: 'তোমার প্রেজেন্টেশনটা দারুণ ছিল!', timestamp: 'গতকাল'},
       { id: 'msg-2-2', sender: mockUsers[2], content: 'ধন্যবাদ! 😊', timestamp: 'গতকাল'},
    ],
  },
  {
    id: 'conv-3',
    participant: mockUsers[3],
    lastMessage: 'ছবিগুলো অসাধারণ!',
    lastMessageTimestamp: '২ দিন আগে',
    messages: [
       { id: 'msg-3-1', sender: mockUsers[3], content: 'ছবিগুলো অসাধারণ!', timestamp: '২ দিন আগে'},
    ],
  },
];
