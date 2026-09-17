ConnectU-কে ভিত্তি করে একটি বড় সামাজিক মাধ্যম তৈরি করা সম্ভব। কিন্তু এখন সবচেয়ে জরুরি কাজ আরও ফিচার যোগ করা নয়; আগে authentication, database এবং data flow-এর অসংগতি ঠিক করে একটি নিরাপদ ও নির্ভরযোগ্য ভিত্তি তৈরি করা। এরপর ব্যবহারকারীর চাহিদা অনুযায়ী ধাপে ধাপে feed, media, messaging, moderation ও infrastructure বড় করতে হবে।

Facebook বা Instagram-এর মতো হওয়ার দুটি আলাদা অর্থ আছে: তাদের মতো ফিচার থাকা এবং তাদের মতো বিপুল ব্যবহারকারী সামলানো। প্রথমটি একটি ছোট দল ধাপে ধাপে করতে পারে। দ্বিতীয়টির জন্য প্রযুক্তির পাশাপাশি দীর্ঘমেয়াদি অর্থায়ন, নিরাপত্তা, content moderation, operations এবং ব্যবহারকারী ধরে রাখার সক্ষমতা দরকার।

নিচে তোমার repository-র নির্দিষ্ট সমস্যা, প্রস্তাবিত architecture, database, feature roadmap, scaling এবং বাস্তবায়নের অগ্রাধিকার বিস্তারিত দিলাম।

সীমা পরিষ্কার রাখি: repository-র গুরুত্বপূর্ণ source ও configuration ফাইল পর্যালোচনা করেছি, কিন্তু অ্যাপ চালিয়ে build, penetration test বা load test করিনি। তাই যেখানে সরাসরি সমস্যা দেখা যাচ্ছে, সেটি আলাদা করে বলছি; আর যেখানে পরীক্ষা দরকার, সেখানে সেটিও উল্লেখ করছি।

১. ConnectU এখন কোন অবস্থায় আছে
১.১ বর্তমান প্রযুক্তি ও কাঠামো

তোমার package.json-এ Next.js 15.3.8, React 18.3.1, TypeScript, Tailwind CSS, Radix UI, NextAuth, PostgreSQL-এর pg, এবং Genkit আছে। অর্থাৎ এটি একটি Next.js-ভিত্তিক social application starter, যার মধ্যে authentication, database এবং AI integration-এর উপাদান রয়েছে। এগুলো repository-তে ঘোষিত version; এগুলোকে সর্বশেষ বা production-এর জন্য নিরাপদ version ধরে নেওয়া যাবে না। package.json

| অংশ | বর্তমানে দেখা যাচ্ছে | তাৎপর্য |
|---|---|---|
| Frontend | Next.js, React, Tailwind, Radix UI | বিদ্যমান interface রেখে এগোনো সম্ভব |
| Authentication | Firebase Auth এবং NextAuth | কোনটি authoritative হবে, নির্ধারণ দরকার |
| Application data | Firestore ব্যবহার এবং PostgreSQL schema/actions | data flow অসম্পূর্ণভাবে বিভক্ত |
| Media upload | Firebase Storage integration | production processing ও access policy দরকার |
| Messaging | Firestore listener-ভিত্তিক page | pagination, authorization ও recovery পরীক্ষা দরকার |
| ভাষা | i18n context ও locales | বাংলা-কেন্দ্রিক product-এর ভিত্তি আছে |
| AI | Genkit ও hashtag generation | core product-এর তুলনায় পরবর্তী অগ্রাধিকার |

হোমপেজ এবং message page-এ Firebase ব্যবহার হচ্ছে; অন্যদিকে post.actions.ts PostgreSQL-এ কাজ করছে এবং auth route-এ NextAuth ও PostgreSQL adapter রয়েছে। এটি কেবল একাধিক প্রযুক্তির উপস্থিতি নয়; একই social data ও identity-এর জন্য ভিন্ন implementation path থাকার বিষয়। হোমপেজ Post actions Auth route

১.২ ভালো দিকগুলো কী

সবকিছু নতুন করে বানানোর দরকার নেই। তোমার project-এ profile, post, follow/feed, search, notification ও messaging-এর page structure আছে। Database schema-তেও users, posts, likes, comments, follows, notifications, conversations ও messages-এর ভিত্তি রয়েছে। App structure Database schema

এগুলো থেকে রাখা যেতে পারে:

• UI components ও page layout: responsive interface উন্নত করার ভিত্তি হিসেবে।
• বাংলা localization: product differentiation-এর অংশ হিসেবে।
• Social data model-এর ধারণা: users, posts, follows ও conversations-এর সম্পর্ক।
• বর্তমান interaction design: create post, like, comment ও profile flow-এর প্রাথমিক কাঠামো।

তবে page থাকা মানেই feature production-ready নয়। সঠিক permission, concurrent request, failure recovery এবং abuse handling আলাদা করে তৈরি করতে হবে।

২. আগে যে সমস্যাগুলো ঠিক করতে হবে
২.১ Firebase এবং PostgreSQL-এর জন্য একটি পরিষ্কার সিদ্ধান্ত নাও

হোমপেজ Firestore থেকে post পড়ছে; create-post component Firestore ও Firebase Storage ব্যবহার করছে; কিন্তু post.actions.ts-এর like/comment actions PostgreSQL-এ write করছে। হোমপেজ Create post Post actions

এই দুই পথ একই user flow-তে ব্যবহৃত হলে consistency ভাঙতে পারে। উদাহরণ:

একটি post Firestore-এ তৈরি হলো।
Like করার সময় PostgreSQL action ডাকা হলো।
PostgreSQL-এ সেই post নেই।
Like ব্যর্থ হলো বা UI ও database-এর state আলাদা হয়ে গেল।

তাই প্রতিটি entity-র জন্য লিখে ফেলো:

| Entity | Authoritative storage | কে write করতে পারবে |
|---|---|---|
| User profile | নির্বাচিত primary database | authenticated backend |
| Post ও comment | একই primary database | permission-checked backend |
| Follow ও block | একই primary database | authenticated backend |
| Media file | object storage | restricted upload flow |
| Session/identity | নির্বাচিত auth system | auth service |
| Search result | derived search index | indexing worker |

Authoritative storage মানে সেই তথ্যের মূল ও নির্ভরযোগ্য উৎস। Cache, feed index বা search index তার অনুলিপি হতে পারে; তারা আলাদা সত্য তৈরি করবে না।

২.২ Server Action-এ ব্যবহারকারীর পরিচয় browser থেকে বিশ্বাস করা যাবে না

post.actions.ts-এ toggleLike ও addComment-এর input হিসেবে userId এবং authorId নেওয়া হচ্ছে। দেখা implementation-এ সেই action-এর ভেতরে session যাচাই করে actor নির্ধারণ করা হচ্ছে না। এটি উচ্চ অগ্রাধিকারের authorization সমস্যা। Post actions

সঠিক প্রবাহ হবে:

Server session বা token যাচাই করবে।
Server নিজে বর্তমান ব্যবহারকারীর ID নির্ধারণ করবে।
Database থেকে post ও তার author বের করবে।
ব্যবহারকারী post দেখতে এবং interact করতে পারে কি না যাচাই করবে।
তারপর like বা comment তৈরি করবে।

Client শুধু পাঠাবে:

``json
{
  "postId": "...",
  "content": "..."
}
`

userId, role, post ownership বা notification recipient client-এর কথায় নির্ধারিত হবে না।

প্রতিটি protected operation-এর জন্য একই নিয়ম দরকার:

• Post edit/delete: কেবল অনুমোদিত owner বা moderator।
• Message read/send: কেবল conversation member, সঙ্গে block policy।
• Profile update: কেবল নিজের অনুমোদিত field।
• Admin action: server-side role যাচাই ও audit log।
• Media access: post বা conversation-এর visibility অনুযায়ী।

২.৩ NextAuth configuration-এর অসামঞ্জস্য ঠিক করো

Auth route-এ CredentialsProvider এবং session.strategy: "database" একসঙ্গে আছে। NextAuth v4-এর Credentials provider-এর documented flow-তে JWT session দরকার। এই combination ঠিক না করলে email/password login সমস্যা করতে পারে। Auth route NextAuth documentation

দুটি পথের একটি নাও:

• Firebase Auth রাখলে: backend-এ Firebase token/session যাচাই করে application user-এর সঙ্গে map করো; অপ্রয়োজনীয় NextAuth path সরিয়ে দাও।
• NextAuth রাখলে: provider, session strategy, callbacks, adapter schema ও signup flow একসঙ্গে সামঞ্জস্যপূর্ণ করো।

শুধু "database" বদলে "jwt" করলেই migration শেষ নয়। Session callback, user ID propagation, logout, password reset, account linking এবং session revocation-ও পরীক্ষা করতে হবে।

২.৪ Build error আড়াল করা বন্ধ করো

next.config.ts-এ বর্তমানে:

`ts
typescript: {
  ignoreBuildErrors: true,
},
eslint: {
  ignoreDuringBuilds: true,
},
`

এই configuration type বা lint সমস্যা থাকা সত্ত্বেও deployment এগোতে দিতে পারে। Next configuration

করতে হবে:

• Typecheck বাধ্যতামূলক করো: npm run typecheck সফল না হলে release বন্ধ।
• Lint configuration সামঞ্জস্যপূর্ণ করো: নির্বাচিত Next.js ও ESLint version অনুযায়ী।
• Build test করো: clean checkout ও নির্ধারিত environment-এ।
• Critical integration test যোগ করো: login, post, permissions, like ও message।
• Dependency review করো: compatibility ও security advisory দেখে version update।

আরেকটি নির্দিষ্ট অসংগতি: source-এ firebase/* import রয়েছে, কিন্তু পর্যালোচিত package.json-এ সরাসরি firebase dependency নেই। Firebase রাখলে সেটি explicit dependency হওয়া উচিত; clean install/build-এ বিষয়টি যাচাই করো। package.json Firebase module

২.৫ Database TLS configuration নিরাপদ করো

src/lib/neon.ts-এ ssl: { rejectUnauthorized: false } দেখা যাচ্ছে। এটি certificate verification নিষ্ক্রিয় করে। Production-এ database provider-এর নির্দেশনা অনুযায়ী যাচাইকৃত TLS connection ব্যবহার করো, প্রয়োজনে সঠিক CA configuration দিয়ে। Database connection

Database secret কখনো NEXTPUBLIC variable-এ দেবে না। তবে Firebase browser configuration-এর API key আর database password এক জিনিস নয়; Firebase data authorization Security Rules, IAM ও প্রাসঙ্গিক সুরক্ষা ব্যবস্থার ওপর নির্ভর করে। Firebase security checklist

২.৬ বর্তমান feed-কে personalized feed ধরে নিও না

হোমপেজে Firestore-এর posts collection থেকে সর্বশেষ ২০টি post আনা হচ্ছে; দেখা query-তে following filter নেই। প্রতিটি post-এর author আলাদা করে পড়া হচ্ছে, এবং সেখানে পরবর্তী page-এর cursor ব্যবহৃত হচ্ছে না। হোমপেজ

প্রথম পরিবর্তনগুলো হওয়া উচিত:

• Following feed: অনুসরণ করা account-এর post।
• Cursor pagination: পরবর্তী page নির্ভরযোগ্যভাবে আনা।
• Author batching/caching: প্রতি post-এ একই author বারবার fetch না করা।
• Visibility filtering: private, blocked, deleted ও moderated content বাদ দেওয়া।
• Failure state: network error হলে retry; অনন্ত loading নয়।

২.৭ Hosting-এর সীমা workload অনুযায়ী বদলাও

apphosting.yaml-এ maxInstances: 1 রয়েছে। এই configuration দিয়ে deploy করা হলে autoscaling এক instance-এ সীমিত থাকবে। Hosting configuration

কিন্তু শুধু instance বাড়ানো সমাধান নয়। প্রতিটি instance-এর database pool, worker concurrency এবং মোট connection limit একসঙ্গে হিসাব করতে হবে। আগে load test, তারপর autoscaling limit ও budget guardrail ঠিক করো।

৩. কোন ধরনের social platform বানাবে, আগে তা নির্ধারণ করো

Facebook ও Instagram-এর সব feature একসঙ্গে নকল করা ConnectU-এর জন্য দুর্বল সূচনা হবে। ব্যবহারকারী কেন সেখানে না গিয়ে এখানে সময় দেবে, তার একটি নির্দিষ্ট উত্তর দরকার।

উদাহরণ হিসেবে তিনটি direction:

| Direction | মূল আকর্ষণ | প্রথম product focus |
|---|---|---|
| বাংলা creator community | স্থানীয় ভাষা ও creator discovery | photo, short post, follow, discovery |
| Campus/community network | নির্দিষ্ট পরিচিত community | groups, discussion, events |
| Interest-based network | একই আগ্রহের মানুষের যোগাযোগ | topic feed, collections, moderation |

একটি direction বেছে প্রথম ১০০-৫০০ ব্যবহারকারীর জন্য অসাধারণ অভিজ্ঞতা তৈরি করো। বাংলা interface গুরুত্বপূর্ণ, কিন্তু তার সঙ্গে relevant content, active creators ও নিরাপদ community না থাকলে মানুষ ফিরে আসবে না।

প্রথম version-এ রাখো:

• Account ও profile: verified identity flow, unique handle, privacy settings।
• Text/photo post: upload, edit/delete, clear failure handling।
• Follow ও feed: following timeline, basic discovery।
• Interaction: like, comment, save।
• Safety: block, mute, report, moderation dashboard।
• Notification: in-app, user-controlled preferences।

Reels, live streaming, marketplace, ads এবং advanced AI recommendation পরে। Messaging রাখলেও সীমিত beta দিয়ে শুরু করা যুক্তিযুক্ত, কারণ private abuse ও delivery reliability আলাদা কাজ।

৪. ConnectU-এর জন্য প্রস্তাবিত architecture
৪.১ প্রথমে modular monolith

আমার সুপারিশ: বর্তমান Next.js UI রেখে modular monolith তৈরি করো। অর্থাৎ শুরুতে backend একটি deployable application হতে পারে, কিন্তু business logic module অনুযায়ী আলাদা থাকবে।

প্রস্তাবিত কাঠামোর diagram:

`mermaid
flowchart TD
    A[Web / Future Mobile App] --> B[CDN and Edge Protection]
    B --> C[Next.js and Application API]
    C --> D[Authentication and Authorization]
    C --> E[Domain Modules]
    E --> F[(Primary Database)]
    E --> G[(Optional Cache)]
    E --> H[Transactional Outbox]
    H --> I[Queue and Workers]
    I --> J[Media Processing]
    I --> K[Notifications and Search Indexing]
    C --> L[Restricted Upload Authorization]
    L --> M[Object Storage]
    J --> M
    M --> N[Media CDN]
`

প্রথম দিন microservices নয়। Microservices দিয়ে শুরু করলে network failure, deployment coordination, tracing, distributed consistency ও operations-এর জটিলতা আগে আসবে; ব্যবহারকারীর মূল্য পরে।

৪.২ Firebase রাখবে, নাকি PostgreSQL?

দুটিই যুক্তিযুক্ত হতে পারে; Firebase দিয়ে বড় হওয়া অসম্ভব বা PostgreSQL নিলেই scale হবে - কোনোটিই সঠিক নয়।

| পথ | কখন উপযুক্ত | মূল সতর্কতা |
|---|---|---|
| Firebase-first | দ্রুত launch, ছোট দল, বিদ্যমান Firebase code কাজে লাগানো | rules, query design, read/listener cost |
| PostgreSQL-first | relational consistency, complex permissions ও reporting | backend, migrations ও connection management |
| পরিকল্পিত hybrid | আলাদা পরিষেবার পরিষ্কার দায়িত্ব আছে | identity mapping ও data ownership স্পষ্ট রাখা |

ConnectU-এর দীর্ঘমেয়াদি লক্ষ্য বিবেচনায় আমার পছন্দ PostgreSQL-কে primary application database করা। তবে যদি Firebase-এ ইতিমধ্যে বাস্তব user/data থাকে, আগে সেটি স্থিতিশীল করে migration করো; তাড়াহুড়ো করে cutover নয়।

Firebase Auth রেখে PostgreSQL-এ application data রাখাও সম্ভব। তখন backend verified Firebase identity থেকে নিজের user record নির্ধারণ করবে। একটি identity authority থাকবে, দুটি বিচ্ছিন্ন login system নয়।

৪.৩ প্রস্তাবিত folder structure

এটি প্রস্তাবিত refactor, বর্তমান repository-র directory listing নয়:

`text
src/
  app/
    api/
      v1/
    login/
    signup/
    profile/
    messages/

  components/
    ui/
    feed/
    profile/
    messaging/

  modules/
    auth/
    users/
    posts/
    social-graph/
    feed/
    media/
    messaging/
    notifications/
    moderation/

  server/
    db/
    authorization/
    cache/
    queue/
    observability/

  shared/
    schemas/
    types/
    errors/

  locales/

workers/
  media/
  notifications/
  indexing/

db/
  migrations/

tests/
  unit/
  integration/
  e2e/
  load/
`

Page ও component-এর কাজ হবে interface দেখানো। Permission, transaction ও business rules থাকবে service/module layer-এ। এতে পরে mobile API বা পৃথক service তৈরি করলেও একই logic ব্যবহার করা যাবে।

৫. Database-কে production উপযোগী করো

বর্তমান schema-তে core social tables আছে। তবে post content VARCHAR(280), একটি image field, basic follow relation এবং like/comment/follow notification type রয়েছে। Instagram-ধরনের carousel, private follow request, content lifecycle ও moderation-এর জন্য model বাড়াতে হবে। Database schema

৫.১ কোন data model যোগ বা পরিবর্তন করবে

| ক্ষেত্র | প্রস্তাবিত model | উদ্দেশ্য |
|---|---|---|
| Identity/profile | auth identity mapping, profiles, settings | login ও public profile আলাদা দায়িত্ব |
| Post | visibility, status, edited/deleted timestamp | privacy ও content lifecycle |
| Media | mediaassets, postmedia | একাধিক ছবি ও video variants |
| Social graph | followrequests, blocks, mutes | private account ও safety |
| Engagement | bookmarks, comment parent relation | save ও threaded replies |
| Moderation | reports, cases, actions, appeals | review ও সিদ্ধান্তের ইতিহাস |
| Reliability | outboxevents, idempotencyrecords | retry ও background work |
| Messaging | membership state, client message ID | reliable delivery ও access control |

Public profile response-এ email, password hash, session তথ্য বা private settings পাঠাবে না। Database row সরাসরি JSON response করার বদলে নির্দিষ্ট response model ব্যবহার করো।

৫.২ Constraints ও indexes

শুধু application validation যথেষ্ট নয়। Database-ও invalid state আটকাবে।

• Unique handle: case ও Unicode normalization policy নির্ধারণ করে uniqueness enforce করো।
• Duplicate like/follow: unique constraint রাখো।
• Self-follow: অনুমোদন না করলে database constraint দাও।
• Foreign key: orphan comment/message/reaction আটকাও।
• Counter: negative না হওয়া ও reconciliation-এর ব্যবস্থা রাখো।
• Message deduplication: conversation, sender ও client message ID অনুযায়ী uniqueness।

বর্তমান schema-তে like ও follow-এর composite primary key আছে; এটি ভালো ভিত্তি। Database schema

PostgreSQL পথ নিলে query pattern অনুযায়ী এই ধরনের index বিবেচনা করো:

`sql
CREATE INDEX postsauthorcreatedididx
ON posts (authorid, createdat DESC, id DESC);

CREATE INDEX followsreverseidx
ON follows (followingid, followerid);

CREATE INDEX commentspostcreatedididx
ON comments (postid, createdat DESC, id DESC);

CREATE INDEX messagesconversationtimeididx
ON messages (conversationid, timestamp DESC, id DESC);
`

এগুলো reference index, production-এ অন্ধভাবে চালানোর migration নয়। Existing index duplication, table size, write overhead এবং online migration procedure দেখে যোগ করবে।

৫.৩ Like toggle-এর বদলে explicit action

Network retry হলে toggleLike অনিচ্ছাকৃতভাবে আগের action উল্টে দিতে পারে। তাই API semantics হওয়া ভালো:

`text
PUT    /api/v1/posts/:postId/like
DELETE /api/v1/posts/:postId/like
`

PUT বারবার এলে like একবারই থাকবে। DELETE বারবার এলে like অনুপস্থিতই থাকবে।

Implementation-এ:

Session ও post access যাচাই।
INSERT ... ON CONFLICT DO NOTHING বা conditional delete।
সত্যিই row বদলালে তবেই counter update।
একই transaction-এ event লেখা।
Notification consumer-এও deduplication।

৫.৪ Migration পদ্ধতি

CREATE TABLE IF NOT EXISTS production schema evolution-এর পূর্ণ ব্যবস্থা নয়। Versioned migrations রাখো।

নিরাপদ পরিবর্তনের ধাপ:

নতুন nullable column/table যোগ।
নতুন code deploy, পুরোনো schema-র সঙ্গে compatible রেখে।
পুরোনো data batch-এ backfill।
count ও relationship যাচাই।
read path নতুন model-এ নেওয়া।
পরে পুরোনো field সরানো।

Firestore থেকে PostgreSQL-এ গেলে user/post ID mapping, timestamps, media references, counts ও permissions যাচাই করতে হবে। ছোট closed beta হলে নির্ধারিত write pause দিয়ে migration সহজ হতে পারে; বড় live system হলে change capture ও reconciliation দরকার।

৬. Feed system কীভাবে তৈরি করবে
৬.১ প্রথম ধাপ: chronological following feed

প্রথম feed-এ AI লাগবে না। অনুসরণ করা account ও নিজের visible post সময় অনুযায়ী দেখাও।

Feed তৈরি করার সময়:

Viewer-এর follow relation বের করো।
দুই দিকের block এবং mute policy প্রয়োগ করো।
Visibility ও moderation status filter করো।
Cursor অনুযায়ী সীমিত post আনো।
Authors ও viewer reactions batch-এ আনো।
Response-এ পরবর্তী cursor দাও।

৬.২ Cursor pagination

বড় feed-এ গভীর OFFSET pagination-এর বদলে stable cursor ব্যবহার করো।

Timestamp-এর সঙ্গে unique ID রাখলে একই সময়ে তৈরি post-এর ordering স্থির রাখা সহজ হয়:

`sql
SELECT id, authorid, content, createdat
FROM posts
WHERE (createdat, id) < ($1::timestamptz, $2::uuid)
ORDER BY createdat DESC, id DESC
LIMIT $3;
`

এটি pagination-এর অংশমাত্র। এর সঙ্গে follow, visibility, block ও status condition যোগ করতে হবে; প্রথম page-এ cursor condition থাকবে না। Cursor কখনো permission-এর বিকল্প নয়।

৬.৩ দ্বিতীয় ধাপ: precomputed timeline

Following query ধীর হলে timeline-এ post ID precompute করা যেতে পারে।

Post প্রকাশের পর worker follower-দের timeline-এ ID রাখবে। কিন্তু খুব বেশি follower-এর account-এর জন্য প্রতিটি publish-এ বিপুল write তৈরি হতে পারে।

তখন hybrid fan-out:

• সাধারণ account: publish-এর পরে timeline-এ distribute।
• বেশি follower-এর account: feed read-এর সময় সাম্প্রতিক post merge।
• Read-time policy check: deleted, private বা blocked content আবার filter।

কোন account কোন পথে যাবে, তা fixed follower number দিয়ে নয়; fan-out delay, queue backlog ও write cost দিয়ে নির্ধারণ করো।

৬.৪ তৃতীয় ধাপ: recommendation

যথেষ্ট interaction data জমলে recommendation যোগ করো:

• Candidate generation: following, topics, similar creators ও fresh content।
• Filtering: privacy, blocks, moderation ও duplicate content।
• Ranking: relevance, freshness, creator relationship, explicit feedback।
• Re-ranking: diversity, একই creator-এর অতিরিক্ত post কমানো।
• Evaluation: retention, satisfaction, hide/report rate।

শুধু watch time বাড়ানোকে সাফল্য ধরবে না। ব্যবহারকারী বিরক্ত হয়ে scroll করলেও watch time বাড়তে পারে। “Not interested”, topic controls ও chronological feed-এর বিকল্প রাখো।

৭. ছবি, carousel ও video pipeline

বর্তমান create-post component Firebase Storage-এ upload flow ব্যবহার করে। বড় media platform-এর জন্য upload-এর সঙ্গে validation, processing, privacy ও cost control যোগ করতে হবে। Create post

৭.১ Image upload-এর নিরাপদ প্রবাহ
Upload authorization: authenticated user quota ও permission যাচাই।
Restricted upload: স্বল্পমেয়াদি upload authorization বা সমতুল্য storage policy।
Quarantine: upload সঙ্গে সঙ্গে public নয়।
Validation: actual file type, decode, dimensions ও size limit।
Processing: orientation ঠিক করা, metadata stripping, thumbnail/variants।
Safety checks: প্রয়োজনীয় content review।
Publish: প্রস্তুত asset post-এর সঙ্গে যুক্ত করা।
Cleanup: অসম্পূর্ণ বা পরিত্যক্ত upload মুছে ফেলা।

Browser-এর MIME type বিশ্বাস করো না। File decode ও server-side validation দরকার।

৭.২ Image model

একটি media asset-এর জন্য রাখো:

`text
asset ID
owner ID
storage key
media type
width and height
file size
processing status
visibility
variant references
created timestamp
deletion state
`

Database-এ পুরো image/video binary রাখার বদলে object storage reference ও metadata রাখো।

৭.৩ Private media

গোপনসদৃশ URL privacy নয়। Private post বা message attachment-এর জন্য access-controlled delivery দরকার।

বিশেষ করে:

• স্বল্পমেয়াদি signed delivery: প্রয়োজনমতো।
• Block বা visibility change: পরবর্তী access-এ প্রয়োগ।
• Delete: database, search, cache ও media lifecycle সমন্বয়।
• CDN policy: private content public cache-এ না যাওয়া।

মেয়াদ শেষ না হওয়া signed URL বা ইতিমধ্যে download করা copy সঙ্গে সঙ্গে ফিরিয়ে নেওয়া যায় না; এই সীমা privacy design ও user messaging-এ বিবেচনা করো।

৭.৪ Video ও Reels পরে

Video চালুর আগে দরকার:

• Resumable upload: দুর্বল network-এ recovery।
• Duration, size ও quota limits: bill ও abuse control।
• Transcoding worker: request handler-এর বাইরে।
• Adaptive streaming: বিভিন্ন connection-এ উপযুক্ত quality।
• Poster ও preview: feed loading দ্রুত করা।
• Moderation ও copyright process: creator ও viewer safety।
• Playback analytics: startup delay, failures, buffering ও completion।

প্রথমে text/photo product-এর retention প্রমাণ করো। তারপর সীমিত creator cohort দিয়ে video beta চালাও।

৮. Messaging-কে নির্ভরযোগ্য ও নিরাপদ করো

বর্তমান message page Firestore listener ব্যবহার করে। এটি realtime interface-এর ভিত্তি, কিন্তু listener থাকা আর পূর্ণ messaging reliability এক নয়। Messages page

৮.১ Message delivery flow
Client একটি unique clientMessageId তৈরি করবে।
Server session, membership, block ও rate limit যাচাই করবে।
Message database-এ persist হবে।
Server acknowledgment দেবে।
Event দিয়ে online recipient-কে notify করবে।
Offline হলে policy অনুযায়ী push যাবে।
Reconnect হলে cursor দিয়ে missing messages আসবে।

Database-এ লেখা নিশ্চিত হওয়ার আগে client-কে final success দেখাবে না। Pending state দেখাতে পারো।

৮.২ অপরিহার্য behavior
• Deduplication: retry-তে একই message দুবার নয়।
• History pagination: পুরো conversation একবারে load নয়।
• Membership checks: fetch ও subscription দুটোতেই।
• Delivery/read state: অর্থ পরিষ্কার ও privacy preference-সম্মত।
• Block behavior: নতুন message এবং ongoing subscription-এর policy।
• Message requests: অপরিচিত account-এর unsolicited message সীমিত করা।

TLS-এ encrypted connection মানেই end-to-end encryption নয়। সত্যিকারের E2EE চাইলে established protocol, audited implementation, device key management, recovery ও multi-device design দরকার। নিজের cryptographic protocol বানাবে না।

৯. Notification, search ও AI
৯.১ Notification-কে background কাজ বানাও

Post বা like request-এর মধ্যে push/email পাঠানো শেষ হওয়ার জন্য অপেক্ষা করিও না।

ভালো pattern:

মূল transaction-এ action ও outbox event লেখা।
Worker event queue-তে পাঠায়।
Notification worker user preference পরীক্ষা করে।
In-app record ও প্রয়োজনীয় push তৈরি করে।
Failure হলে সীমিত retry এবং dead-letter handling।

একটি post-এ অনেক like হলে aggregate notification দাও; প্রতিটি event আলাদা push হয়ে বিরক্তি তৈরি করবে না।

৯.২ Search

প্রথমে username, display name, hashtag ও public post search। Dataset ছোট থাকলে PostgreSQL-ভিত্তিক search দিয়ে শুরু করা যায়; Bengali matching quality পরীক্ষা জরুরি।

পরবর্তীতে dedicated search engine লাগলে:

• Index asynchronous রাখো।
• Delete/privacy change index-এ পৌঁছাও।
• Search result-এও access control প্রয়োগ করো।
• বাংলা normalization, বানানভেদ ও transliteration পরীক্ষা করো।
• সব search log অনির্দিষ্টকাল রেখো না।

৯.৩ AI feature

Hashtag generation থাকতে পারে, কিন্তু optional enhancement হিসেবে।

• Timeout ও fallback: AI ব্যর্থ হলেও post publish হবে।
• Rate limit ও budget: account প্রতি ব্যবহার সীমা।
• Privacy: private content অপ্রয়োজনীয়ভাবে বাইরের model-এ পাঠাবে না।
• Validation: AI output-ও untrusted input।
• Human review: গুরুতর moderation বা account action শুধু model-এর সিদ্ধান্তে নয়।

১০. Security ও moderation প্রথম release-এর অংশ
১০.১ Security baseline

Login screen access control নয়। প্রত্যেক data operation সুরক্ষিত হতে হবে।

অন্তত:

• Session security: উপযুক্ত secure cookie/token handling, expiry ও revocation।
• Server validation: input schema, body limits, allowed fields।
• Authorization tests: ownership, membership, visibility ও role।
• SQL safety: parameterized queries।
• XSS/CSRF protection: rendering ও authentication flow অনুযায়ী।
• Rate limits: signup, login, reset, posting, follows, comments, messages।
• Secret management: browser bundle ও logs থেকে sensitive data বাদ।
• Upload security: invalid file, oversized payload ও malicious content প্রতিরোধ।
• Admin protection: MFA, least privilege ও audit trail।
• Abuse monitoring: account farming, spam এবং billing abuse।

Firebase client SDK রাখলে Firestore ও Storage Rules-ও test করতে হবে। UI button লুকিয়ে রাখা Rules-এর বিকল্প নয়। Firebase Security Rules

১০.২ Moderation workflow

Report button আছে কিন্তু review করার কেউ নেই - এমন ব্যবস্থা launch-ready নয়।

Workflow:

`text
Report submitted
  -> Severity triage
  -> Review queue
  -> Evidence and policy review
  -> Action
  -> User notification
  -> Appeal
  -> Resolution record
`

প্রথম থেকেই দরকার:

• Community guidelines: harassment, threats, scams ও impersonation-এর policy।
• Block/mute/report: সহজে খুঁজে পাওয়া যায় এমন control।
• Moderator dashboard: content ও context নিরাপদভাবে দেখা।
• Action levels: warning, content removal, temporary restriction, suspension।
• Appeal: ভুল সিদ্ধান্ত সংশোধনের সুযোগ।
• Audit log: কে কী action নিয়েছে।
• Child safety ও urgent escalation: বিশেষ review procedure।

১০.৩ Privacy ও আইন

Privacy policy, terms, account deletion, data export, retention ও copyright complaint process লিখে রাখো। কোন আইন প্রযোজ্য হবে তা target market, user age ও processing location-এর ওপর নির্ভর করবে। Launch-এর আগে যোগ্য আইনজীবীর review নাও; এটি আইনি পরামর্শের বিকল্প নয়।

Delete account মানে শুধু users row মুছে ফেলা নয়। Sessions, posts, media, search index, analytics identifiers এবং backup retention policy-ও সমন্বয় করতে হবে।

১১. Performance ও scaling-এর বাস্তব ক্রম

Registered user count দেখে architecture বদলাবে না। Daily activity, peak request rate, feed reads, uploads, realtime connections ও media delivery পরিমাপ করো।

| পর্যায় | প্রধান কাজ | পরবর্তী পরিবর্তনের সংকেত |
|---|---|---|
| Closed beta | correctness, permissions, backups | core flow স্থিতিশীল |
| প্রথম কয়েক হাজার active user | query/index tuning, CDN, সীমিত cache | latency বা DB load বাড়ছে |
| বড় active community | stateless autoscaling, worker scaling | peak load ও backlog |
| নির্দিষ্ট bottleneck | feed precompute, search service, replicas | measured limit |
| বহু বাজার/বৃহৎ ব্যবহার | regional strategy, selective partitioning | latency, residency, availability চাহিদা |

১১.১ Scaling-এর অগ্রাধিকার
অপ্রয়োজনীয় query সরাও।
N+1 fetch দূর করো।
সঠিক index ও query plan পরীক্ষা করো।
Image/video CDN দিয়ে পরিবেশন করো।
নিরাপদ cache যোগ করো।
ধীর কাজ background worker-এ নাও।
Application ও worker আলাদা scale করো।
প্রমাণিত bottleneck হলে service extraction বা partitioning।

Redis বা Kubernetes যোগ করাই scalability নয়। Cache invalidation, failover ও operations-এর দায়িত্বও আসে।

১১.২ Cache-এ privacy

যে data viewer অনুযায়ী বদলায়, সেটি শুধু post ID দিয়ে public shared cache করা যাবে না।

উদাহরণ:

• Private post access।
• Viewer-এর liked/bookmarked state।
• Blocked author filtering।
• Conversation membership।
• Moderator-only content।

Cached candidate list পেলেও final response-এর আগে প্রয়োজনীয় visibility check থাকবে।

১১.৩ Monitoring

কমপক্ষে পরিমাপ করো:

| ক্ষেত্র | Metric | কেন দরকার |
|---|---|---|
| API | p95/p99 latency, error rate | ধীর বা ব্যর্থ request |
| Database | slow queries, connections, locks | bottleneck |
| Workers | queue age, retries, failures | pending কাজ |
| Media | upload success, processing time | creator experience |
| Messaging | acknowledgment ও delivery delay | reliability |
| Product | activation, cohort retention | ব্যবহারকারীর মূল্য |
| Safety | reports, response time, appeals | community health |
| Cost | storage, delivery, AI, SMS | আর্থিক sustainability |

DAU বাড়লেও retention কমে গেলে শুধু server বাড়িয়ে product-এর সমস্যা সমাধান হবে না।

১২. Testing, deployment ও disaster recovery
১২.১ Critical tests

সুখকর flow-এর চেয়ে permission ও failure test বেশি গুরুত্বপূর্ণ।

• Identity forgery: client অন্য user ID দিলে কী হয়।
• Private content: URL জানা থাকলেও অননুমোদিত user পড়তে পারে কি না।
• Concurrent likes: duplicate row বা counter corruption হয় কি না।
• Message retry: একই message একবারের বেশি তৈরি হয় কি না।
• Upload failure: অসম্পূর্ণ asset orphan থাকে কি না।
• Deleted content: feed, search ও media access বন্ধ হয় কি না।
• Block transition: পুরোনো cache/subscription access দেয় কি না।
• Auth linking: একই email/provider flow-তে account takeover সম্ভব কি না।
• Dependency outage: AI, push বা queue ব্যর্থ হলে core action টিকে থাকে কি না।

১২.২ Release pipeline

`text
Pull request
  -> Typecheck
  -> Lint
  -> Unit tests
  -> Database/rules integration tests
  -> Build
  -> Staging
  -> End-to-end tests
  -> Controlled production rollout
  -> Smoke tests and monitoring
`

Staging ও production আলাদা environment হবে। Production database নিয়ে local development করবে না।

১২.৩ Backup ও recovery

শুধু backup চালু নয়, restore rehearsal দরকার।

নির্ধারণ করো:

• RPO: সর্বোচ্চ কত সময়ের data loss গ্রহণযোগ্য।
• RTO: outage-এর পরে কত সময়ে ফেরত আসতে হবে।
• Database restore: কোথায়, কীভাবে ও কে করবে।
• Media recovery: object deletion/versioning policy।
• Rollback: code ও schema পরিবর্তন কীভাবে সামলাবে।
• Incident response: কে alert পাবে, কে সিদ্ধান্ত নেবে।

প্রথমে ছোট লক্ষ্যমাত্রা নিতে পারো, কিন্তু প্রমাণ ছাড়া uptime বা zero-data-loss প্রতিশ্রুতি দেবে না।

১৩. Mobile ও বাংলা ব্যবহারকারীর অভিজ্ঞতা

প্রথমে ভালো mobile web/PWA বানাও, native app দিয়ে backend-এর সমস্যা ঢাকার চেষ্টা নয়।

অগ্রাধিকার:

• দুর্বল network: retry, offline draft, clear pending state।
• Data saver: compressed images, controlled autoplay।
• বাংলা typography: যুক্তাক্ষর, line height ও ছোট screen-এ readability।
• Accessibility: keyboard, screen reader, contrast ও touch targets।
• Long feed performance: প্রয়োজনে virtualization।
• Scroll restoration: post খুলে ফিরে এলে আগের অবস্থান।
• Upload progress: cancel ও retry।
• Empty states: নতুন user-কে follow/topic discovery-এর পথ দেখানো।

Product-এর প্রয়োজন প্রমাণ হলে native app তৈরি করো। Shared TypeScript types ও validation reuse করা যাবে, তবে সব web UI সরাসরি mobile-এ যাবে ধরে নিও না। Mobile API-এর জন্য versioning ও backward compatibility রাখো।

১৪. খরচ কীভাবে পরিকল্পনা করবে

ব্যবহারকারীর সংখ্যা একা খরচের ভালো মাপকাঠি নয়। Text/photo community ও autoplay video app-এর ব্যয় এক হবে না।

প্রধান cost driver:

| Cost driver | কী দিয়ে বাড়ে | প্রাথমিক নিয়ন্ত্রণ |
|---|---|---|
| Media delivery | views, file size, autoplay | CDN, variants, data saver |
| Storage | originals, variants, retention | quotas, cleanup, lifecycle |
| Video processing | duration, resolutions, uploads | সীমিত beta ও duration |
| Database | queries, indexes, writes | efficient queries ও pooling |
| Auth/SMS | verification ও abuse | throttling, fraud controls |
| AI | calls ও input size | optional flow ও caps |
| Operations | incidents ও moderation | tooling, process ও staffing |

মাসিক planning model-এ রাখো:

`text
Total cost =
  application hosting
  + database
  + media storage
  + media delivery
  + processing workers
  + realtime infrastructure
  + email/SMS/push
  + search/observability
  + AI
  + support and moderation
  + engineering
`

Free tier-কে business model ধরে নিও না। Budget alert, upload quota, AI cap, SMS limit এবং autoscaling ceiling শুরুতেই রাখো। নির্দিষ্ট provider quote ছাড়া “এক লাখ user-এর খরচ এত” বলা বিভ্রান্তিকর হবে।

১৫. বাস্তবসম্মত roadmap

নিচের সময়রেখা ছোট অভিজ্ঞ দলের planning estimate, নিশ্চয়তা নয়। একা কাজ করলে scope কমাতে হবে এবং সময় বাড়বে। এটি Facebook-scale delivery schedule নয়; নিরাপদ সীমিত beta তৈরি করার পরিকল্পনা।

পর্যায় ১: ভিত্তি ঠিক করা, আনুমানিক সপ্তাহ ১-২

লক্ষ্য: একটি ধারাবাহিক, যাচাইযোগ্য application।

• Primary auth ও database সিদ্ধান্ত।
• Clean install/build।
• Type/lint gate।
• Client-supplied identity সরানো।
• Schema ও environment configuration।
• Secrets ও TLS review।
• README-তে setup ও architecture লেখা।

শেষ হওয়ার শর্ত: দুটি test account দিয়ে signup, login, post ও interaction একই data source-এ কাজ করে।

পর্যায় ২: Core social experience, আনুমানিক সপ্তাহ ৩-৫

লক্ষ্য: text/photo community ব্যবহারযোগ্য করা।

• Unique handle ও profile।
• Secure media upload।
• Follow ও chronological feed।
• Cursor pagination।
• Idempotent like ও comments।
• Save, block, mute, report।
• Basic search ও notification।

শেষ হওয়ার শর্ত: core flow, permission ও retry tests পাস করে।

পর্যায় ৩: Operational readiness, আনুমানিক সপ্তাহ ৬-৮

লক্ষ্য: ছোট বাস্তব community নিরাপদে চালানো।

• Moderation dashboard।
• Worker/outbox pipeline।
• Rate limits ও quotas।
• Error tracking ও latency monitoring।
• CI/CD ও staging।
• Backup restore test।
• Account deletion flow।

শেষ হওয়ার শর্ত: simulated abuse, failure ও recovery exercise সম্পন্ন।

পর্যায় ৪: Closed beta, আনুমানিক সপ্তাহ ৯-১২

লক্ষ্য: মানুষ সত্যিই ফিরে আসে কি না বোঝা।

• নির্দিষ্ট community onboarding।
• Relevant creators ও initial content।
• Activation ও cohort retention মাপা।
• Slow/failed flow ঠিক করা।
• Support ও moderation process পরীক্ষা।
• সীমিত messaging beta, যদি প্রস্তুত থাকে।

শেষ হওয়ার শর্ত: feedback ও retention দিয়ে পরবর্তী feature অগ্রাধিকার নির্ধারণ।

পর্যায় ৫: Beta-পরবর্তী বৃদ্ধি

লক্ষ্য: প্রমাণিত ব্যবহার অনুযায়ী বিনিয়োগ।

• Video বা community feature-এর মধ্যে একটি।
• Recommendation-এর প্রাথমিক পরীক্ষা।
• প্রয়োজন হলে native app।
• Measured bottleneck অনুযায়ী scaling।
• Monetization experiment।
• Safety ও operations team সম্প্রসারণ।

১৬. তোমার repository-তে কাজের সুনির্দিষ্ট ক্রম

এটি developer task list হিসেবে ব্যবহার করতে পারো।

| অগ্রাধিকার | ফাইল/এলাকা | কাজ |
|---|---|---|
| P0 | src/lib/post.actions.ts | server-verified actor, ownership/visibility checks |
| P0 | Auth route ও Firebase auth flow | একটি coherent identity system |
| P0 | package.json | dependencies, compatibility ও clean build |
| P0 | next.config.ts | error suppression বাদ, quality gate |
| P0 | src/lib/neon.ts | verified TLS, pooling ও timeouts |
| P0 | Firestore/Storage access | ব্যবহৃত হলে tested security rules |
| P1 | src/app/page.tsx | following feed, pagination, batched authors |
| P1 | src/components/create-post.tsx | authenticated write ও secure media lifecycle |
| P1 | docs/neon-schema.sql` | versioned migrations, privacy ও constraints |
| P1 | Messaging | membership, deduplication, pagination, recovery |
| P1 | Moderation | block/report এবং review dashboard |
| P1 | Hosting/deployment | staging, restore, monitoring ও load test |
| P2 | Media | carousel, processing workers, পরে video |
| P2 | Discovery | বাংলা search quality ও ranking |
| P3 | Infrastructure | প্রয়োজন প্রমাণ হলে service extraction |

পুরোনো Firebase/Neon/MongoDB-সংশ্লিষ্ট ফাইল নাম দেখেই delete করো না। Import graph ও actual data flow দেখে কোনটি ব্যবহৃত হচ্ছে নিশ্চিত করো; তারপর legacy path সরাও।

১৭. বড় platform হওয়ার ব্যবসায়িক দিক

Technology মানুষকে platform-এ রাখার সুযোগ দেয়; ফিরে আসার কারণ তৈরি করে product ও community।

প্রথম growth loop হওয়া উচিত:

নির্দিষ্ট community থেকে ভালো creator আসে।
Creator নিয়মিত relevant content দেয়।
নতুন user সহজে সেটি আবিষ্কার করে।
Follow, discussion ও সম্পর্ক তৈরি হয়।
User নিজের পরিচিত বা একই আগ্রহের মানুষকে আনে।
Creator response পেয়ে আবার content দেয়।

পরিমাপ করো:

• Activation: নতুন user meaningful follow বা interaction করে কি না।
• Cohort retention: একই signup cohort পরের সপ্তাহ/মাসে ফিরে আসে কি না।
• Creator retention: creator আবার publish করে কি না।
• Content relevance: hide, mute, report ও explicit feedback।
• Safety burden: moderation workload কত দ্রুত বাড়ছে।
• Unit economics: active user বা media consumption বাড়লে খরচ কেমন বদলায়।

Fake followers, spam invitations বা manipulative notifications দিয়ে সংখ্যার বৃদ্ধি দীর্ঘস্থায়ী community তৈরি করবে না।

Monetization-এর জন্য পরে premium creator tools, community subscription বা business feature পরীক্ষা করা যেতে পারে। Ad platform নিজেই বড় product; audience, measurement, privacy ও fraud control ছাড়া শুরুতেই সেটি বানানো উচিত নয়।

আমার চূড়ান্ত সুপারিশ

ConnectU ফেলে নতুন project শুরু করো না; এটিকে সুশৃঙ্খলভাবে refactor করো। তোমার জন্য যুক্তিযুক্ত পথ:

প্রথমে security ও consistency: auth, database, permissions, clean build।
তারপর ছোট শক্তিশালী product: বাংলা-কেন্দ্রিক নির্দিষ্ট community, text/photo, follow/feed, safety।
তারপর reliability: media pipeline, queues, monitoring, backups ও tests।
তারপর retention: মানুষ কেন ফিরছে, তা পরিমাপ ও উন্নত করা।
সবশেষে measured scale: traffic অনুযায়ী feed precompute, worker scaling, search ও service separation।

তোমার এখনকার সবচেয়ে গুরুত্বপূর্ণ milestone “Facebook-এর সব feature আছে” নয়; “একই নিরাপদ system-এ ১০০ জন বাস্তব মানুষ নিয়মিত post, follow ও interaction করছে, এবং কোনো failure হলে data ও access control ঠিক থাকছে।” এই ভিত্তি তৈরি হলে ConnectU-কে বড় করার পরবর্তী সিদ্ধান্তগুলো অনেক বেশি পরিষ্কার ও কম ব্যয়বহুল হবে।

ConnectU-কে Facebook বা Instagram-এর মতো **বৃহৎ সামাজিক মাধ্যম** বানাতে হলে বর্তমান প্রকল্পটাকে শুধু “আরও কিছু feature যোগ করা” দিয়ে হবে না। মূলত এটাকে একটি **social-networking platform architecture**-এ রূপান্তর করতে হবে।

আমি আপনার বর্তমান `joysriramsarkar/connectu` repository দেখে বলছি। এখনকার অবস্থায় এটি একটি **Next.js + Firebase/Firestore + Firebase Auth + PostgreSQL/Neon + NextAuth + কিছু AI**-ভিত্তিক প্রোটোটাইপ/early-stage social app। README-ও এখনও Firebase Studio starter হিসেবে আছে।

সবচেয়ে গুরুত্বপূর্ণ সমস্যা হলো: **একই অ্যাপে দুই ধরনের backend architecture পাশাপাশি চলছে।** Home/feed Firebase Firestore ব্যবহার করছে, আবার likes/comments-এর server actions Neon/PostgreSQL ব্যবহার করছে; authentication-ও Firebase Auth এবং NextAuth/PostgreSQL—দুই দিকেই আছে।

এটা ছোট prototype-এ চলতে পারে, কিন্তু Facebook-স্তরের architecture-এর জন্য আপনাকে স্পষ্ট boundary তৈরি করতে হবে।

---

# ১. প্রথমে বুঝুন: Facebook/Instagram আসলে কী

একটি বড় social network মানে শুধু:

`Login → Post → Like → Comment`

নয়।

বাস্তবে platform-টির মধ্যে থাকে:

```text
Identity
├── Registration
├── Login
├── Phone/email verification
├── Sessions
├── Devices
├── Account recovery
└── Security

Social Graph
├── Follow
├── Friend
├── Block
├── Mute
├── Restrict
├── Close friends
└── Suggestions

Content
├── Text posts
├── Photos
├── Videos
├── Carousels
├── Stories
├── Reels
├── Live
├── Polls
├── Links
└── Reshares

Feed
├── Following feed
├── Recommended feed
├── Ranking
├── Personalisation
├── Explore
└── Trending

Interactions
├── Like
├── Comment
├── Reply
├── Share
├── Save
├── Reaction
└── Mention

Messaging
├── 1:1
├── Group chat
├── Media
├── Read receipts
├── Typing
├── Presence
└── Notifications

Discovery
├── User search
├── Hashtags
├── Posts
├── Topics
├── People you may know
└── Trending

Safety
├── Report
├── Block
├── Spam
├── Moderation
├── Content filtering
├── Rate limiting
└── Account protection

Platform
├── Analytics
├── Admin
├── Observability
├── Jobs
├── Queues
├── Caching
├── CDN
└── Disaster recovery
```

তাই ConnectU-কে feature-by-feature নয়, **system-by-system** তৈরি করতে হবে।

---

# ২. বর্তমান ConnectU-তে কী আছে

আপনার blueprint-এ বর্তমানে profile, post, like/comment, follow/feed, AI hashtag generation, messaging, image/video upload এবং Bengali UI-এর লক্ষ্য নির্ধারিত আছে।

বর্তমান database schema-তে আছে:

```text
users
posts
likes
comments
follows
notifications
conversations
conversation_participants
messages
```

এবং basic indexes-ও আছে।

কিন্তু বড় social network-এর জন্য data model আরও অনেক গভীর হতে হবে।

আর একটি গুরুত্বপূর্ণ বিষয়:

বর্তমান home feed:

```ts
query(
  collection(db, "posts"),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

অর্থাৎ এটি essentially **global recent-post feed**।

Facebook/Instagram-এর personalised feed এভাবে কাজ করে না।

---

# ৩. প্রথম architectural সিদ্ধান্ত: Firebase + PostgreSQL + MongoDB একসঙ্গে নয়

এখন repository-তে:

```text
Firebase
├── Auth
├── Firestore
└── Storage

PostgreSQL / Neon
├── Users
├── Posts
├── Likes
├── Comments
├── Follows
└── Auth adapter

MongoDB
└── connection layer
```

এই তিনটি একসঙ্গে রাখার কারণ থাকলে রাখতে পারেন, কিন্তু **একই entity-এর source of truth তিন জায়গায় রাখা যাবে না**।

বিশেষ করে আপনার codebase-এ Firebase এবং PostgreSQL দুই জায়গায় user/post-related logic দেখা যাচ্ছে।

আমি ConnectU-এর জন্য এই architecture নিতাম:

```text
                   ┌──────────────────┐
                   │     Clients      │
                   │ Web / Android / iOS │
                   └────────┬─────────┘
                            │
                     CDN / WAF / API
                            │
                    ┌───────▼────────┐
                    │ API Gateway /  │
                    │ BFF            │
                    └───────┬────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
     Identity           Social Graph        Content API
          │                 │                  │
     PostgreSQL         PostgreSQL        PostgreSQL
          │                 │                  │
          └─────────────────┼──────────────────┘
                            │
                         Redis
                            │
                         Queue
                            │
          ┌─────────────────┼────────────────────┐
          │                 │                    │
     Feed workers       Notification          Media
                          workers             workers
                                                  │
                                             Object Storage
                                                  │
                                                 CDN
```

### আপনার জন্য শুরুতে

Microservices দিয়ে শুরু করবেন না।

বরং:

```text
Modular Monolith
+
PostgreSQL
+
Redis
+
Object Storage
+
Queue
```

এটাই সবচেয়ে বাস্তবসম্মত।

User সংখ্যা কয়েক হাজার থেকে কয়েক লাখ পর্যন্ত গেলে modular monolith যথেষ্ট হতে পারে।

তারপর প্রয়োজন হলে service আলাদা করবেন।

---

# ৪. Backend-এর মূল ভিত্তি: PostgreSQL

আপনার বর্তমান Neon schema ভালো শুরু, কিন্তু বড় করতে schema-টি নতুন করে design করা প্রয়োজন।

উদাহরণ:

```text
users
user_profiles
user_credentials
user_sessions
user_devices

follows
blocks
mutes
restrictions
close_friends

posts
post_media
post_mentions
post_hashtags
post_visibility
post_reactions

comments
comment_replies

saved_posts
shares
bookmarks

notifications
notification_preferences

conversations
conversation_members
messages
message_media
message_reads
typing_state
presence

stories
story_views

reels
reel_views

reports
moderation_actions

hashtags
hashtags_posts

feed_candidates
feed_events

devices
push_tokens

audit_logs
```

---

# ৫. `users` table-কে ছোট রাখুন

বর্তমানে:

```sql
users
```

এর মধ্যে name, bio, avatar, cover, followers, following ইত্যাদি আছে।

বড় scale-এ আমি এটাকে ভাগ করব।

### users

```sql
users
------
id
username
email
phone
status
created_at
updated_at
```

### profiles

```sql
profiles
--------
user_id
display_name
bio
avatar_url
cover_url
website
location
birth_date
```

### account_security

```text
user_id
password_hash
email_verified
phone_verified
two_factor_enabled
```

কারণ profile বারবার বদলাবে, কিন্তু identity/security information অন্য lifecycle-এর।

---

# ৬. Followers count সরাসরি user row-তে blindly update করবেন না

আপনার বর্তমান schema:

```sql
followers INTEGER
following INTEGER
```

এইভাবে শুরু করা ঠিক আছে। কিন্তু হাজার হাজার concurrent follow/unfollow হলে একই row hotspot তৈরি করতে পারে।

মূল relationship হবে:

```sql
follows
-------
follower_id
following_id
created_at
```

এর ওপর:

```sql
PRIMARY KEY (follower_id, following_id)
```

এবং প্রয়োজনমতো cached count থাকবে।

```text
actual relationship
        ↓
follows table

fast display count
        ↓
counter cache
```

সঠিক সংখ্যা দরকার হলে asynchronously reconcile করা যাবে।

---

# ৭. সবচেয়ে গুরুত্বপূর্ণ: Feed architecture

এটাই ConnectU-এর সবচেয়ে বড় upgrade।

বর্তমানে:

```text
সব পোস্ট
   ↓
createdAt DESC
   ↓
20 posts
```

এটা social network নয়; এটা chronological public feed।

Instagram/Facebook-style feed করতে হবে:

```text
User follows 500 people

        ↓

Candidate generation

        ↓

5000 possible posts

        ↓

Filtering

        ↓

Scoring

        ↓

Ranking

        ↓

Top 20/50

        ↓

Feed
```

---

# ৮. Feed recommendation engine

প্রতিটি post-এর জন্য features থাকবে:

```text
post_age
author_relationship
likes
comments
shares
saves
watch_time
clicks
hide_rate
report_rate
author_quality
topic_similarity
language_similarity
user_interest
```

তারপর একটি score:

```text
score =
    freshness
  + relationship_score
  + engagement_score
  + interest_score
  + quality_score
  - negative_feedback
```

শুরুতে machine learning লাগবে না।

Rule-based ranking দিয়ে শুরু করুন।

উদাহরণ:

```ts
score =
  0.30 * relationshipScore +
  0.25 * engagementScore +
  0.20 * interestScore +
  0.15 * freshnessScore +
  0.10 * qualityScore;
```

পরে historical interaction থেকে ML model train করবেন।

---

# ৯. Feed-এর জন্য `fan-out` architecture

এটি অত্যন্ত গুরুত্বপূর্ণ।

ধরা যাক:

```text
User A
followers = 10,000
```

User A একটি post করল।

দুটি পদ্ধতি।

### Pull model

প্রত্যেক user-এর feed দেখানোর সময়:

```text
আমার following list
↓
সবাইয়ের latest posts
↓
merge
↓
rank
```

বড় scale-এ expensive।

### Push model

A post করল:

```text
A post
 ↓
fan-out worker
 ↓
followers' feed cache
```

তার ফলে feed read অনেক দ্রুত।

কিন্তু celebrity account-এর ক্ষেত্রে 10 million followers থাকলে 10 million writes সমস্যা।

তাই hybrid:

```text
Normal user
→ fan-out-on-write

Celebrity
→ fan-out-on-read
```

এটাই ভবিষ্যতে ConnectU-তে করা উচিত।

---

# ১০. Redis লাগবে

PostgreSQL সবকিছুর cache হিসেবে ব্যবহার করবেন না।

Redis ব্যবহার করুন:

```text
Redis
├── sessions
├── feed cache
├── hot posts
├── rate limits
├── online status
├── typing status
├── counters
├── locks
└── temporary tokens
```

উদাহরণ:

```text
feed:user:9823
```

contains:

```text
[
  post123,
  post981,
  post112,
  ...
]
```

তারপর API এই IDs নিয়ে PostgreSQL থেকে post details আনবে।

---

# ১১. Like architecture

আপনার বর্তমান like action PostgreSQL transaction-এ:

```text
check existing like
↓
insert/delete
↓
likes counter update
```

এটি ছোট scale-এ ঠিক আছে।

কিন্তু বড় scale-এ:

```text
likes
```

এবং

```text
like_count
```

আলাদা concern।

আপনার source of truth:

```sql
post_likes
```

display count:

```text
cached counter
```

এবং high-traffic post হলে Redis/increment queue ব্যবহার করতে পারেন।

---

# ১২. Firebase Firestore রাখবেন কি?

রাখতে পারেন, কিন্তু এর কাজ নির্দিষ্ট করতে হবে।

Firestore real-time workload-এর জন্য যথেষ্ট শক্তিশালী এবং horizontal scaling করতে পারে; Firebase-এর নিজস্ব documentation high-scale realtime workloads-এর জন্য hotspot avoidance এবং traffic ramp-up-এর কথা বলে। ([Firebase][1])

তবে ConnectU-র ক্ষেত্রে আমি:

```text
PostgreSQL
→ authoritative social data

Firestore
→ realtime-only workloads
```

এভাবে ভাবতাম।

উদাহরণ:

```text
chat typing
presence
temporary realtime state
```

কিন্তু users/posts/follows-এর canonical data একসঙ্গে PostgreSQL এবং Firestore-এ রাখতে চাইতাম না।

---

# ১৩. Firestore counters নিয়ে সাবধান

Firebase-এর documentation নিজেই বলে frequently updated single-document counters contention তৈরি করতে পারে এবং distributed counter ব্যবহার করতে হয়। ([Firebase][2])

তাই:

```text
posts/{postId}
likes: 5839281
```

একটি document-এ বারবার:

```text
likes++
```

করার architecture ব্যবহার করবেন না, বিশেষ করে massively viral content-এর জন্য।

---

# ১৪. Media system আলাদা করতে হবে

Instagram-এর মতো platform-এর জন্য image/video handling অত্যন্ত গুরুত্বপূর্ণ।

আপনার blueprint-এ image/video upload আছে।

কিন্তু production architecture:

```text
Browser / Android
       │
       ▼
Presigned upload / Firebase Storage
       │
       ▼
Object Storage
       │
       ▼
Upload event
       │
       ▼
Media Worker
       │
       ├── Image resize
       ├── Thumbnail
       ├── WebP/AVIF
       ├── Video transcoding
       ├── HLS
       └── Moderation
       │
       ▼
CDN
```

Firebase Cloud Storage user-generated image/video-এর জন্য direct client upload এবং large-scale object storage support করে। ([Firebase][3])

---

# ১৫. Original image কখনও সরাসরি serve করবেন না

ধরা যাক:

```text
original.jpg
```

10 MB।

এটা browser-এ পাঠানো উচিত নয়।

Generate করুন:

```text
240w
480w
720w
1080w
1440w
```

এবং thumbnails:

```text
80x80
160x160
320x320
```

তারপর browser:

```html
<img
  src="image-720.webp"
  srcset="
    image-480.webp 480w,
    image-720.webp 720w,
    image-1080.webp 1080w
  "
/>
```

---

# ১৬. Video system আরও কঠিন

Reels-এর জন্য:

```text
upload.mp4
    ↓
FFmpeg
    ↓
240p
360p
480p
720p
1080p
    ↓
HLS segments
    ↓
CDN
```

তার সঙ্গে:

```text
thumbnail
preview
duration
codec
width
height
bitrate
```

store করবেন।

---

# ১৭. Post schema

বর্তমান post:

```text
id
author_id
content
image
likes
comments
created_at
```

এটি খুবই ছোট।

আমি করতাম:

```text
posts
-----
id
author_id
type
text
visibility
status
location_id
created_at
published_at
edited_at
deleted_at
```

আর media:

```text
post_media
----------
id
post_id
media_type
object_key
thumbnail_key
width
height
duration
sort_order
```

তাহলে:

```text
Text post
Image post
Carousel
Video
Poll
Link
```

সব support করা যাবে।

---

# ১৮. Instagram-style Carousel

একটি post:

```text
post_id = 101
```

এর media:

```text
1.jpg
2.jpg
3.jpg
4.jpg
```

এগুলিকে আলাদা media row হিসেবে রাখবেন।

এতে:

```text
carousel
ordering
replacement
deletion
processing
```

সহজ হবে।

---

# ১৯. Comment system

বর্তমান comments table আছে।

কিন্তু Instagram-style:

```text
Comment
 ├── Reply
 │   ├── Reply
 │   └── Reply
```

এর জন্য:

```sql
comments
---------
id
post_id
author_id
parent_id
content
depth
created_at
deleted_at
```

`parent_id = NULL` হলে top-level comment।

---

# ২০. Reactions

শুধু Like রাখবেন না।

```text
like
love
haha
wow
sad
angry
```

table:

```text
post_reactions
--------------
post_id
user_id
reaction_type
created_at
```

একজন user-এর একটি active reaction।

---

# ২১. Share / Repost

দুটি আলাদা concept:

```text
Share externally
```

এবং:

```text
Repost inside ConnectU
```

তার জন্য:

```text
post_shares
reposts
```

আলাদা।

---

# ২২. Saved posts

Instagram-এর মতো:

```text
Save
```

করতে চাইলে:

```sql
saved_posts
-----------
user_id
post_id
created_at
```

তার ওপর:

```text
Collections
```

যোগ করতে পারেন:

```text
saved_collections
collection_items
```

---

# ২৩. Follow এবং Friend—দুই model রাখুন

Facebook-এর মতো social graph চাইলে শুধু follow যথেষ্ট নয়।

```text
Follow
```

এবং:

```text
Friend request
```

দুটিই হতে পারে।

Schema:

```text
follows
friend_requests
friendships
blocks
mutes
restrictions
```

Account privacy:

```text
public
private
```

Private account হলে:

```text
follow request
```

ব্যবস্থা।

---

# ২৪. Profile system

Profile page:

```text
/avatar
/cover
/name
/username
/bio
/link
/location
/joined date
```

Tabs:

```text
Posts
Replies
Media
Likes
Reels
Saved   ← only owner
```

Follower/following pages:

```text
Followers
Following
Mutuals
```

---

# ২৫. Search engine PostgreSQL-এর LIKE query হবে না

আপনার search feature আছে, কিন্তু বড় platform-এ:

```sql
WHERE username ILIKE '%joy%'
```

এটাই primary search architecture হওয়া উচিত নয়।

ব্যবহার করুন:

```text
OpenSearch / Elasticsearch
```

অথবা managed search।

Indices:

```text
users
posts
hashtags
topics
```

Fields:

```text
username
display_name
bio
post_text
hashtags
```

---

# ২৬. Bengali search-এর জন্য বিশেষ ব্যবস্থা

এখানে ConnectU-এর একটি বড় সুযোগ আছে।

বাংলা language-first platform হলে search-এ:

```text
বাংলা
Bangla
Bengali
বাংলা Unicode variations
```

normalize করতে হবে।

যেমন:

```text
কলকাতা
কলকাতা
কলিকাতা
```

এগুলো semantic search-এ কাছাকাছি করা যেতে পারে।

এখানে ভবিষ্যতে AI/embedding ব্যবহার করতে পারবেন।

---

# ২৭. Hashtag system

AI hashtag generator আপনার project-এ ইতিমধ্যে আছে। blueprint-এ এটাকে feature হিসেবে নির্ধারণ করা হয়েছে।

কিন্তু AI-generated hashtag-কে সরাসরি canonical hashtag বানাবেন না।

Flow:

```text
User text
   ↓
AI suggestions
   ↓
User approves
   ↓
Normalize
   ↓
hashtags
   ↓
post_hashtags
```

---

# ২৮. Explore page

Instagram-style Explore:

```text
Trending
Recommended
Popular near you
Topics
Creators
Reels
Photos
```

এখানে feed-এর মতো ranking engine কাজ করবে।

---

# ২৯. Trending engine

উদাহরণ:

```text
hashtag #
mentions
shares
velocity
```

সবচেয়ে গুরুত্বপূর্ণ হলো **velocity**, শুধু total count নয়।

ধরা যাক:

```text
#A = 1 million uses
```

কিন্তু গত 24 ঘণ্টায় নতুন 50।

অন্যদিকে:

```text
#B = 20,000 uses
```

কিন্তু গত এক ঘণ্টায় 10,000।

তখন B trending হতে পারে।

---

# ৩০. Notification architecture

বর্তমান notification schema খুব basic:

```text
like
comment
follow
```

এটা বাড়িয়ে:

```text
notification_type
actor_id
recipient_id
entity_type
entity_id
metadata
read_at
created_at
```

এবং types:

```text
LIKE
COMMENT
REPLY
FOLLOW
FOLLOW_REQUEST
FOLLOW_ACCEPTED
MENTION
TAG
SHARE
REPOST
MESSAGE
SYSTEM
```

---

# ৩১. Notification fan-out

কেউ viral post করল:

```text
100,000 likes
```

প্রত্যেক like-এর notification immediately DB-তে একইভাবে লিখতে থাকলে সমস্যা হবে।

এখানে batching:

```text
Joy liked your post
```

তারপর:

```text
Joy and 4,382 others liked your post
```

এভাবে notification aggregation করা উচিত।

---

# ৩২. Messaging

বর্তমান messaging Firestore-এ real-time `onSnapshot()` ব্যবহার করছে।

Prototype-এর জন্য ভালো।

Production Messenger-এর জন্য দরকার:

```text
WebSocket
```

বা:

```text
Socket.IO
```

অথবা managed realtime infrastructure।

---

# ৩৩. Message architecture

```text
conversation
conversation_members
messages
message_attachments
message_reads
message_reactions
```

Message:

```text
id
conversation_id
sender_id
type
text
created_at
edited_at
deleted_at
reply_to_id
```

type:

```text
TEXT
IMAGE
VIDEO
AUDIO
FILE
STICKER
SYSTEM
```

---

# ৩৪. Online status

Redis:

```text
presence:user:123
```

এর মতো temporary key:

```text
TTL = 30 sec
```

user প্রতি heartbeat:

```text
online
```

heartbeat বন্ধ:

```text
offline
```

Firestore-এ permanently `online=true` রেখে দেবেন না।

---

# ৩৫. Read receipts

```text
message_reads
-------------
message_id
user_id
read_at
```

অথবা conversation level:

```text
last_read_message_id
```

এতে group chat অনেক efficient হবে।

---

# ৩৬. Stories

Instagram-like product চাইলে Stories অত্যন্ত গুরুত্বপূর্ণ।

```text
stories
-------
id
user_id
media_id
expires_at
created_at
```

২৪ ঘণ্টা পরে hide।

কিন্তু DB থেকে instantly delete করা বাধ্যতামূলক নয়।

Background job:

```text
expired stories
↓
cleanup worker
```

---

# ৩৭. Reels / Short video

Reels-কে সাধারণ post-এর `type=video` মাত্র হিসেবে দেখলে পরে architecture কঠিন হবে।

কারণ Reels-এর আলাদা metrics:

```text
impressions
3-sec views
watch time
completion rate
rewatches
shares
saves
skips
```

এগুলো recommendation engine-এর জন্য ব্যবহার হবে।

---

# ৩৮. Feed event tracking

এটি খুব গুরুত্বপূর্ণ এবং এখন আপনার app-এ practically নেই।

প্রতিটি meaningful action record করুন:

```text
impression
view
like
comment
share
save
follow
unfollow
hide
not_interested
profile_visit
video_start
video_complete
```

এগুলো `events` system-এ যাবে।

---

# ৩৯. কিন্তু সব analytics PostgreSQL-এ লিখবেন না

উদাহরণ:

একজন user ৩০ মিনিট scroll করল।

সে হয়তো হাজার impression তৈরি করল।

প্রতিটি event সরাসরি transactional PostgreSQL-এ লিখলে database চাপ বাড়বে।

ব্যবহার করুন:

```text
Client
 ↓
Event API
 ↓
Queue
 ↓
Kafka / Pub/Sub
 ↓
Analytics store
```

শুরুতে:

```text
PostgreSQL
+
background batch
```

দিয়েও চলবে।

বড় হলে:

```text
Kafka
ClickHouse / BigQuery
```

ধরনের architecture নিতে পারেন।

---

# ৪০. Queue system অপরিহার্য

Background কাজগুলো request lifecycle-এ করবেন না।

যেমন:

```text
POST /posts
```

এর মধ্যে করবেন না:

```text
AI hashtag
image resize
notifications
feed fanout
email
push
analytics
```

বরং:

```text
Create post
   ↓
DB commit
   ↓
Publish job
   ↓
Queue
```

তারপর:

```text
worker
 ├── media processing
 ├── hashtag generation
 ├── feed fanout
 ├── notifications
 └── analytics
```

---

# ৪১. Redis Queue / BullMQ দিয়ে শুরু করতে পারেন

Node.js ecosystem-এ:

```text
BullMQ
+
Redis
```

ConnectU-এর জন্য practical শুরু হতে পারে।

Queues:

```text
media-processing
feed-fanout
notification
email
push
moderation
analytics
search-index
```

---

# ৪২. AI-কে core database-এর মধ্যে ঢোকাবেন না

ConnectU-তে AI থাকবে, কিন্তু AI যেন পুরো product-এর backend-এর সঙ্গে tightly coupled না হয়।

AI services:

```text
Hashtag generation
Content classification
Spam detection
Recommendation features
Comment moderation
Translation
Search understanding
Alt-text generation
```

আলাদা interface:

```ts
generateHashtags()
moderateContent()
classifyTopic()
generateAltText()
translateText()
```

পরে provider বদলালেও core system ভাঙবে না।

---

# ৪৩. Moderation system—শুরু থেকেই

বড় social platform-এর সবচেয়ে অবহেলিত অংশ এটি।

Tables:

```text
reports
moderation_cases
moderation_actions
user_warnings
blocked_content
```

Report reasons:

```text
spam
harassment
hate
violence
sexual
fraud
impersonation
copyright
other
```

---

# ৪৪. Block/Mute/Restrict অত্যন্ত জরুরি

প্রতিটি request-এর আগে কিছু graph check:

```text
Does A block B?
Does B block A?
Does A mute B?
Is B restricted?
```

বিশেষ করে feed query এবং comments-এর ক্ষেত্রে।

---

# ৪৫. Rate limiting

একজন user:

```text
signup
login
follow
comment
like
message
post
search
```

সব infinite করতে পারবেন না।

Redis-based rate limit:

```text
login:
5/min

comments:
30/min

posts:
10/hour

follow:
100/day
```

অবশ্য exact values user type ও abuse pattern অনুযায়ী ঠিক হবে।

---

# ৪৬. Bot protection

Production social platform-এ দরকার:

```text
IP reputation
device fingerprinting
request throttling
CAPTCHA
email/phone verification
suspicious login detection
```

---

# ৪৭. Authentication architecture

বর্তমানে আপনার NextAuth database session এবং Firebase Auth—দুই architecture রয়েছে।

এটা consolidate করুন।

একটি পথ:

```text
Auth.js / NextAuth
+
PostgreSQL
```

অথবা:

```text
Firebase Auth
+
PostgreSQL user profile DB
```

যেটাই নেন:

```text
একটি canonical identity
```

থাকতে হবে।

---

# ৪৮. Mobile app অবশ্যই তৈরি করুন

Facebook/Instagram-style experience শুধু website দিয়ে সীমাবদ্ধ রাখবেন না।

Architecture:

```text
Next.js
→ Web

React Native / Flutter / native Android
→ Mobile
```

আপনার জন্য প্রথমে:

```text
Next.js Web
```

তারপর:

```text
Android
```

আমি Android-কে অগ্রাধিকার দিতাম।

কারণ social media use-case-এ mobile হল primary experience।

---

# ৪৯. API-first architecture নিন

UI থেকে সরাসরি database access বন্ধ করুন।

বর্তমান Home-এ client-side Firestore access আছে।

production architecture:

```text
UI
 ↓
API
 ↓
service layer
 ↓
repository/data layer
 ↓
DB
```

অর্থাৎ:

```text
React component
```

এর মধ্যে:

```ts
getDocs(...)
```

কমিয়ে আনবেন।

---

# ৫০. Domain modules তৈরি করুন

একটি modular monolith structure:

```text
src/
├── app/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── profiles/
│   ├── posts/
│   ├── comments/
│   ├── reactions/
│   ├── follows/
│   ├── feed/
│   ├── search/
│   ├── messaging/
│   ├── notifications/
│   ├── stories/
│   ├── reels/
│   ├── moderation/
│   └── analytics/
│
├── infrastructure/
│   ├── postgres/
│   ├── redis/
│   ├── storage/
│   ├── queue/
│   └── search/
│
└── shared/
```

এটা আপনার project-এর সবচেয়ে গুরুত্বপূর্ণ refactor-গুলোর একটি হবে।

---

# ৫১. API endpoints

যেমন:

```text
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/logout

GET    /api/v1/users/:id
PATCH  /api/v1/users/:id

POST   /api/v1/follows/:userId
DELETE /api/v1/follows/:userId

POST   /api/v1/posts
GET    /api/v1/posts/:id
DELETE /api/v1/posts/:id

POST   /api/v1/posts/:id/like
DELETE /api/v1/posts/:id/like

POST   /api/v1/posts/:id/comments

GET    /api/v1/feed
GET    /api/v1/explore

GET    /api/v1/search

GET    /api/v1/notifications

GET    /api/v1/conversations
POST   /api/v1/conversations
GET    /api/v1/conversations/:id/messages
POST   /api/v1/conversations/:id/messages
```

API-এর version শুরু থেকেই দিন:

```text
/api/v1/
```

---

# ৫২. Cursor pagination ব্যবহার করুন

এভাবে নয়:

```text
?page=100000
```

বরং:

```text
?cursor=eyJpZCI6...
```

Feed:

```text
GET /feed?limit=20&cursor=...
```

কারণ offset pagination বড় data set-এ inefficient হতে পারে।

---

# ৫৩. Database query pattern

Feed query-এর index:

```sql
(author_id, created_at DESC)
```

Comments:

```sql
(post_id, created_at DESC)
```

Followers:

```sql
(following_id, created_at DESC)
(follower_id, created_at DESC)
```

Messages:

```sql
(conversation_id, created_at DESC)
```

একেক query pattern অনুযায়ী index।

---

# ৫৪. PostgreSQL partitioning

Posts, events, messages-এর মতো gigantic table হলে future-এ partitioning ব্যবহার করতে পারেন।

PostgreSQL declarative partitioning সমর্থন করে এবং বড় table-কে logical partitions-এ ভাগ করলে নির্দিষ্ট workload-এ query performance ও maintenance সুবিধা পাওয়া যায়। ([PostgreSQL][4])

উদাহরণ:

```text
events
├── 2026_01
├── 2026_02
├── 2026_03
...
```

কিন্তু একেবারে শুরুতেই partitioning করবেন না।

প্রথমে real workload measure করুন।

---

# ৫৫. CDN

Static:

```text
JS
CSS
fonts
```

এবং media:

```text
images
videos
avatars
thumbnails
```

সব CDN-এর পেছনে।

Architecture:

```text
User
 ↓
CDN
 ↓
Origin Storage
```

API traffic:

```text
User
 ↓
CDN/WAF
 ↓
Load balancer
 ↓
App
```

---

# ৫৬. Load balancer

App server যেন stateful না হয়।

ধরুন:

```text
server 1
server 2
server 3
server 4
```

সব একই application চালাবে।

Session:

```text
Redis/Postgres
```

Media:

```text
Object Storage
```

তাহলে যেকোনো request যেকোনো server নিতে পারবে।

---

# ৫৭. Containerization

শুরুতেই Docker করুন:

```text
connectu-web
connectu-worker
connectu-realtime
```

এতে deployment environment stable থাকবে।

---

# ৫৮. CI/CD

GitHub Actions:

```text
push
 ↓
lint
 ↓
typecheck
 ↓
unit tests
 ↓
integration tests
 ↓
build
 ↓
security scan
 ↓
deploy staging
 ↓
smoke tests
 ↓
production
```

---

# ৫৯. Testing

শুধু UI test নয়।

### Unit

```text
feed scoring
permissions
privacy
validation
```

### Integration

```text
create post
follow
like
comment
message
```

### E2E

```text
signup
login
create post
follow user
like post
send message
```

### Load test

```text
10 users
100
1,000
10,000
100,000 concurrent
```

পর্যায়ে পর্যায়ে।

---

# ৬০. Observability

Production-এ শুধু:

```ts
console.log()
```

রাখবেন না।

লাগবে:

```text
logs
metrics
traces
alerts
```

যেমন:

```text
API latency
DB latency
Redis hit rate
queue depth
error rate
feed generation time
media processing time
```

---

# ৬১. Security

অবশ্যই:

```text
HTTPS
secure cookies
CSRF protection
XSS protection
SQL injection protection
input validation
content security policy
rate limiting
password hashing
session revocation
device management
```

Password কখনও plain text নয়।

আপনার বর্তমান credentials provider bcrypt ব্যবহার করছে, যা ভালো ভিত্তি।

---

# ৬২. Privacy architecture

User profile-এর সঙ্গে:

```text
public
followers
friends
only_me
```

visibility রাখুন।

Post-এর জন্য:

```text
PUBLIC
FOLLOWERS
FRIENDS
CUSTOM
ONLY_ME
```

Comments এবং messages-এর access একই privacy layer অনুসরণ করবে।

---

# ৬৩. Bengali-first architecture

এটি ConnectU-এর আলাদা পরিচয় হতে পারে।

বর্তমান blueprint-এই Bengali UI-র লক্ষ্য আছে।

শুধু UI translation নয়:

```text
বাংলা UI
বাংলা onboarding
বাংলা notification
বাংলা search
বাংলা moderation
বাংলা content recommendation
বাংলা typography
বাংলা accessibility
```

এমনকি:

```text
"Like"
```

এর বদলে UI:

```text
পছন্দ
```

যদি আপনি এমন language system চান।

তবে internal code ইংরেজিতে রাখাই ভালো:

```ts
reactionType: "like"
```

UI layer-এ বাংলা।

---

# ৬৪. Content recommendation-এ বাংলা semantic model

ভবিষ্যতে user interest profile তৈরি করতে পারেন:

```text
বাংলা গান
সিনেমা
প্রযুক্তি
ক্রিকেট
রাজনীতি
শিক্ষা
কবিতা
গল্প
```

User interaction থেকে:

```text
interest_vector
```

তৈরি হবে।

এতে Explore আরও personalised হবে।

---

# ৬৫. Admin dashboard

আপনি নিজে platform চালাবেন। তাই:

```text
/admin
```

এখানে:

```text
Users
Posts
Reports
Moderation
Banned users
Verification
Trending
Analytics
System health
```

থাকবে।

---

# ৬৬. Admin roles

শুধু একটি admin role রাখবেন না:

```text
super_admin
admin
moderator
support
analyst
trust_safety
```

এবং role-based permission:

```text
RBAC
```

---

# ৬৭. Verification

পরবর্তী পর্যায়ে:

```text
phone verified
email verified
creator verified
organization verified
```

এরপর platform-specific verification system করা যাবে।

---

# ৬৮. Creator ecosystem

বড় social network-এ creators গুরুত্বপূর্ণ।

যোগ করুন:

```text
Creator profile
Creator analytics
Follower analytics
Post analytics
Video analytics
Audience insights
```

---

# ৬৯. Monetization

অনেক পরে:

```text
ads
creator subscriptions
tips
premium profiles
business pages
sponsored posts
```

কিন্তু শুরুতে monetization-এর আগে network quality তৈরি করুন।

---

# ৭০. Business/Page system

Facebook-like platform হলে পরে:

```text
personal profile
business page
community
creator page
organization
```

আলাদা entity হতে পারে।

---

# ৭১. Groups

Facebook-like scale চাইলে:

```text
groups
group_members
group_posts
group_roles
group_rules
```

দরকার।

Roles:

```text
owner
admin
moderator
member
```

---

# ৭২. Community system

এটি ConnectU-কে শুধু Instagram clone না বানিয়ে আলাদা product করতে পারে।

যেমন:

```text
Siliguri Developers
বাংলা সাহিত্য
North Bengal Students
বাংলা গান
Gaming
Photography
```

প্রতিটি community-তে:

```text
posts
members
moderation
events
```

---

# ৭৩. Event system

আরও বড় করলে:

```text
events
event_members
event_posts
event_notifications
```

---

# ৭৪. Live streaming

এটা এখন নয়।

অনেক পরে:

```text
WebRTC
RTMP
media server
transcoding
CDN
chat
```

---

# ৭৫. Video recommendation-এর মূল metric

Reels-এ:

```text
likes
```

এর চেয়ে অনেক বেশি গুরুত্বপূর্ণ:

```text
watch time
completion rate
skip rate
rewatch
share
save
profile visit
follow after watch
```

---

# ৭৬. Algorithm একেবারে শুরুতে কীভাবে করবেন

প্রথম version:

```text
score =
    25% relationship
    25% freshness
    20% engagement
    15% interests
    10% quality
     5% diversity
```

কিন্তু একই creator-এর 20টি পোস্ট যেন পরপর না আসে।

সেখানে:

```text
creator diversity
topic diversity
media diversity
```

যোগ করুন।

---

# ৭৭. Feed-এ “Not interested” দিন

User বলল:

```text
এই ধরনের পোস্ট আর দেখতে চাই না
```

এটা enormous signal।

তখন:

```text
negative_feedback
```

record হবে।

---

# ৭৮. Recommendation data model

ভবিষ্যতে:

```text
user_interest
user_topic_affinity
user_author_affinity
user_negative_signals
content_features
```

রাখতে পারেন।

---

# ৭৯. Search + Feed + Recommendation—তিনটি আলাদা system

এগুলো একসঙ্গে মিশিয়ে ফেলবেন না।

```text
Search
→ user explicitly asks

Feed
→ user follows/interacts

Recommendation
→ system predicts
```

তিনটির ranking logic আলাদা।

---

# ৮০. Current ConnectU-এর immediate problem list

আপনার বর্তমান repo দেখে আমার চোখে সবচেয়ে বড় architectural issues:

### ১. Dual backend

Firebase + Neon দুটোই business logic করছে।

### ২. Dual authentication

Firebase Auth + NextAuth/Postgres।

### ৩. Feed is not personalised

Global `createdAt DESC`.

### ৪. Data model too small

Social graph, moderation, media, analytics, privacy, device/session, reactions—এসব নেই।

### ৫. API boundary দুর্বল

UI সরাসরি Firebase-এ access করছে।

### ৬. Messaging prototype-level

Firestore subscriptions দিয়ে basic chat চলছে।

### ৭. Media pipeline নেই

Upload ≠ Instagram-quality media system।

### ৮. Background job architecture নেই

AI, fanout, notification, media processing asynchronous করা হয়নি।

---

# ৮১. আমি ConnectU-কে কোন technology stack দিতাম

## Frontend

```text
Next.js
React
TypeScript
Tailwind
shadcn/ui
```

বর্তমান stack এর সঙ্গে সামঞ্জস্যপূর্ণ।

আপনার package-এ Next 15, React 18, TypeScript এবং বিভিন্ন Radix UI component ইতিমধ্যেই আছে।

---

## Core backend

```text
Node.js
TypeScript
Next.js route handlers
```

প্রথমে modular monolith।

---

## Database

```text
PostgreSQL
```

Neon এখন prototype-এর জন্য ভালো।

বড় হলে managed PostgreSQL / cloud deployment architecture অনুযায়ী move করতে পারবেন।

---

## Cache

```text
Redis
```

---

## Queue

```text
BullMQ
Redis
```

বড় scale:

```text
Kafka / Pub/Sub
```

---

## Object storage

```text
Google Cloud Storage
```

অথবা Firebase Storage।

Cloud Storage for Firebase মূলত Google Cloud Storage-এর ওপর চলে এবং user-generated media-এর জন্য scalable object storage সরবরাহ করে। ([Firebase][3])

---

## Search

```text
OpenSearch
```

---

## CDN

```text
Cloud CDN
Cloudflare
Fastly
```

---

## Analytics

শুরুতে:

```text
Postgres + scheduled aggregation
```

পরে:

```text
ClickHouse
BigQuery
```

---

## Mobile

```text
Android
```

প্রথম priority।

---

# ৮২. Repository structure কেমন করব

আমি ConnectU-কে শেষ পর্যন্ত এমন করতে চাইতাম:

```text
connectu/
│
├── apps/
│   ├── web/
│   ├── android/
│   └── admin/
│
├── services/
│   ├── api/
│   ├── worker/
│   ├── realtime/
│   └── media/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── config/
│   └── i18n/
│
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   └── k8s/
│
├── docs/
│
└── tests/
```

তবে **এখনই microservice monorepo করার দরকার নেই**।

প্রথমে:

```text
apps/web
packages/*
```

দিয়ে modular monolith করুন।

---

# ৮৩. Database layer

```text
src/modules/posts/
├── post.service.ts
├── post.repository.ts
├── post.schema.ts
├── post.types.ts
└── post.routes.ts
```

তারপর:

```text
post.service
```

business logic জানবে।

```text
post.repository
```

database জানবে।

React component database জানবে না।

---

# ৮৪. Validation

সব input:

```text
Zod
```

দিয়ে validate করুন।

যেমন:

```ts
CreatePostSchema
```

```text
text
media
visibility
location
mentions
hashtags
```

---

# ৮৫. Caching strategy

Cache করবেন:

```text
profile
public post
feed ids
trending hashtags
suggested users
```

কিন্তু cache invalidation carefully করতে হবে।

Rule:

```text
source of truth = database
cache = disposable
```

---

# ৮৬. Offline-friendly mobile app

Android app-এ:

```text
draft posts
upload retry
message retry
cached feed
offline compose
```

রাখুন।

বিশেষ করে ভারতীয় mobile network-এর জন্য এটি বাস্তবসম্মত।

---

# ৮৭. Image upload UX

Post create:

```text
Select
↓
Preview
↓
Compress
↓
Upload
↓
Progress
↓
Processing
↓
Published
```

Upload failure হলে:

```text
Retry
```

হবে।

---

# ৮৮. Large upload resumability

Storage direct upload ব্যবহার করুন।

Firebase Storage network interruption-এ uploads resume/retry করতে পারে। ([Firebase][3])

---

# ৮৯. Feed loading UX

```text
initial 10
↓
intersection observer
↓
next 10
↓
prefetch next page
```

কিন্তু infinite scroll-এর পাশাপাশি:

```text
New posts
```

button রাখুন।

---

# ৯০. Performance budget

Page:

```text
LCP < 2.5s
```

এর মতো measurable target রাখুন।

Mobile:

```text
low bandwidth mode
```

রাখুন।

Images:

```text
lazy loading
responsive images
WebP/AVIF
```

---

# ৯১. Database connection pooling

আপনার বর্তমান Neon pool:

```ts
max: 5
```

আছে।

এটা বড় scale-এর জন্য hard-coded universal answer নয়।

Serverless environment হলে connection management নিয়ে বিশেষভাবে design করতে হবে।

---

# ৯২. Disaster recovery

Production:

```text
daily backup
point-in-time recovery
replica
restore testing
```

শুধু backup নেওয়া যথেষ্ট নয়।

মাঝে মাঝে test করতে হবে:

```text
Can we actually restore?
```

---

# ৯৩. Multi-region

শুরুতে প্রয়োজন নেই।

প্রথমে:

```text
India / Asia region
```

যেখানে primary users।

ব্যবহারকারী বাড়লে:

```text
India
Singapore
Europe
US
```

regional architecture ভাববেন।

---

# ৯৪. কিন্তু multi-region database শুরুতেই করবেন না

এতে complexity প্রচুর বাড়ে।

প্রথমে:

```text
one primary DB
multiple app servers
Redis
CDN
```

এটাই যথেষ্ট।

---

# ৯৫. Social graph scale

একজন user-এর:

```text
followers = 5 million
```

হতে পারে।

তার follower list direct giant query দিয়ে load করবেন না।

Pagination:

```text
cursor
```

এবং graph caching প্রয়োজন।

---

# ৯৬. Celebrity account problem

এটি আগে থেকেই design করতে হবে।

ধরা যাক:

```text
user A = 10M followers
```

তিনি post করলেন।

10M feed rows synchronous write করলে system ভেঙে যেতে পারে।

তাই:

```text
normal users
→ push fanout

high-degree users
→ pull-on-read
```

এই heuristic architecture রাখুন।

---

# ৯৭. Search suggestions

Type করার সময়:

```text
joy
```

দিলে:

```text
Joy Sarkar
Joy Music
Joy Tech
```

suggest করতে হবে।

এগুলো cached + search index-driven হবে।

---

# ৯৮. User recommendation

“People you may know”:

শুরুতে:

```text
mutual follows
same communities
same interests
same location (with consent)
same interactions
```

তারপর ML।

---

# ৯৯. Privacy-first design

আপনি বাংলা social network বানালেও privacy system universal হতে হবে।

User যেন control করতে পারে:

```text
Who can follow me?
Who can message me?
Who can comment?
Who can tag me?
Who can mention me?
Who can see my stories?
Who can search me?
```

---

# ১০০. Verification/security event log

প্রতিটি sensitive event:

```text
password change
email change
phone change
new device
session revoke
2FA change
```

audit log করুন।

---

# ১০১. API idempotency

যেমন:

```text
POST /posts
```

network retry হলে একই post দুবার যেন না তৈরি হয়।

তাই:

```text
Idempotency-Key
```

support করুন।

বিশেষ করে:

```text
payments
posts
messages
uploads
```

এটি পরে অত্যন্ত কাজে আসবে।

---

# ১০২. Event-driven architecture

ধরা যাক user:

```text
creates post
```

Main transaction:

```text
posts.insert
```

তারপর:

```text
PostCreated
```

event:

```text
PostCreated
 ├── FeedWorker
 ├── SearchWorker
 ├── HashtagWorker
 ├── ModerationWorker
 ├── NotificationWorker
 └── AnalyticsWorker
```

এটাই বড় architecture-এর ভিত্তি।

---

# ১০৩. Database transaction বনাম event

Core transaction ছোট রাখবেন।

```text
BEGIN
insert post
insert post_media
COMMIT
```

এরপর async:

```text
fanout
AI
notification
search indexing
```

---

# ১০৪. “Exactly once” নিয়ে obsess করবেন না

Distributed systems-এ practical approach:

```text
at least once delivery
+
idempotent workers
```

এটাই ভালো।

যেমন worker একই job দুবার পেলে:

```text
already_processed
```

চেক করে second time harmless হবে।

---

# ১০৫. Versioning

Database migration:

```text
Drizzle
Prisma
Kysely
Flyway
```

যে migration tool নিন, migration history রাখুন।

Production DB হাতে হাতে SQL পরিবর্তন করবেন না।

---

# ১০৬. ORM নাকি raw SQL?

আপনার বর্তমান code raw SQL ব্যবহার করছে।

এটি খারাপ নয়।

আমি আপনার মতো project-এ:

```text
Drizzle ORM
```

বা:

```text
Kysely
```

বিবেচনা করতাম।

কারণ TypeScript type-safety পাবেন এবং complex queries-এর control থাকবে।

---

# ১০৭. Observability-এর minimum

প্রতিটি request:

```text
request_id
user_id
route
latency
status
```

log করবে।

একটা request trace:

```text
request
 ↓
API
 ↓
DB
 ↓
Redis
 ↓
queue
```

trace করতে পারলে production debugging অনেক সহজ হবে।

---

# ১০৮. ConnectU-এর feature roadmap

## Phase 0 — Architecture reset

```text
Firebase/Neon conflict resolve
Auth consolidate
API layer
Postgres schema redesign
Repository/service layer
```

এটাই এখন প্রথম কাজ।

---

# ১০৯. Phase 1 — Strong social core

প্রথমে:

```text
Signup/Login
Profile
Follow
Block
Post
Image
Like
Comment
Reply
Share
Save
Notification
Search
```

এই পুরো core flawless করুন।

---

# ১১০. Phase 2 — Real feed

```text
Following feed
Chronological feed
Recommended feed
Candidate generation
Ranking
Caching
```

---

# ১১১. Phase 3 — Media

```text
multiple images
video
processing
thumbnails
CDN
resumable upload
```

---

# ১১২. Phase 4 — Messaging

```text
1:1
groups
realtime
read receipts
presence
media
push notification
```

---

# ১১৩. Phase 5 — Stories + Reels

```text
Stories
Reels
Watch metrics
Recommendation
```

---

# ১১৪. Phase 6 — Communities

```text
Groups
Pages
Communities
Events
```

---

# ১১৫. Phase 7 — Scale

```text
Redis
queues
workers
search cluster
analytics
CDN
autoscaling
read replicas
partitioning
```

---

# ১১৬. Phase 8 — Intelligence

```text
AI moderation
recommendation
semantic search
translation
content understanding
spam detection
creator insights
```

---

# ১১৭. Phase 9 — Platform ecosystem

তারপর:

```text
Ads
Creator monetization
Business accounts
Developer API
OAuth
Webhooks
Third-party apps
```

---

# ১১৮. আপনার জন্য সবচেয়ে গুরুত্বপূর্ণ বিষয়

আমি **এখনই Facebook clone বানানোর চেষ্টা করতাম না**।

কারণ আপনি যদি একসঙ্গে:

```text
Stories
Reels
Live
Groups
Ads
AI
Messaging
Video
Marketplace
```

করতে যান, project শেষ হবে না।

বরং ConnectU-এর core identity:

> **বাংলাভিত্তিক, mobile-first, privacy-aware social network**

এভাবে ধরুন।

তারপর প্রথম লক্ষ্য:

```text
10 users
→ 100
→ 1,000
→ 10,000
→ 100,000
```

প্রতিটি পর্যায়ে architecture evolve করবে।

---

# ১১৯. বর্তমান repo থেকে আমি যে বাস্তব পরিবর্তন শুরু করতাম

এখন আপনার repo-তে কাজের order আমি এমন রাখতাম:

```text
01. Firebase/NextAuth সিদ্ধান্ত
02. PostgreSQL canonical schema
03. Auth module
04. User/Profile module
05. Follow graph
06. Post module
07. Media module
08. Reaction/comment module
09. Notification module
10. API layer
11. Cursor pagination
12. Following feed
13. Redis
14. Feed ranking
15. Queue/worker
16. Search
17. Messaging
18. Stories
19. Reels
20. Moderation
21. Analytics
22. Mobile
23. Production infrastructure
```

---

# ১২০. ConnectU-কে কীভাবে “বড়” করা উচিত—সবচেয়ে গুরুত্বপূর্ণ দর্শন

একটি বড় social network তৈরি হয় না:

```text
অনেক feature
```

দিয়ে।

এটি তৈরি হয়:

```text
বিশাল social graph
+
দ্রুত content delivery
+
ভালো recommendation
+
নির্ভরযোগ্য media pipeline
+
real-time communication
+
দৃঢ় abuse prevention
+
উচ্চ availability
+
ভালো UX
```

দিয়ে।

আর আপনার বর্তমান ConnectU-র সবচেয়ে বড় সম্পদ হলো **আপনি ইতিমধ্যে profile, post, follow, comments, notifications, messaging, AI hashtag generation এবং Bengali UI-এর একটি প্রাথমিক ভিত্তি তৈরি করেছেন**।

কিন্তু সবচেয়ে বড় architectural কাজ হবে এই prototype-টিকে:

```text
Firebase demo
```

থেকে:

```text
Production-grade social platform
```

এবং পরে:

```text
Distributed social network
```

এ রূপান্তর করা।

Firebase নিজেই high-scale realtime workloads-এর জন্য horizontal scaling, hotspot avoidance এবং careful data modelling-এর প্রয়োজনীয়তা ব্যাখ্যা করেছে; আর media-এর ক্ষেত্রে Cloud Storage direct upload ও large-scale object storage-এর উপযোগী। ([Firebase][1])

### ConnectU-এর জন্য আমার target architecture

```text
                    CONNECTU
                       │
             ┌─────────▼─────────┐
             │    CDN / WAF      │
             └─────────┬─────────┘
                       │
             ┌─────────▼─────────┐
             │    API Layer      │
             └─────────┬─────────┘
                       │
       ┌───────────────┼────────────────┐
       │               │                │
   PostgreSQL        Redis            Queue
       │               │                │
       │          ┌────┴────┐           │
       │          │  Feed   │           │
       │          │  Cache  │           │
       │          └─────────┘           │
       │                                │
       │                       ┌────────┼────────┐
       │                       │        │        │
       │                    Feed     Media    Notify
       │                   Worker   Worker    Worker
       │                       │        │        │
       │                       │    Object      │
       │                       │    Storage     │
       │                       │        │        │
       └───────────────┬───────┴────────┴────────┘
                       │
                 Search / Analytics
                       │
              ┌────────┴────────┐
              │                 │
           OpenSearch        ClickHouse
```

এটাই সেই direction যেদিকে আমি ConnectU-কে নিতে বলব—**এখন modular monolith, পরে প্রয়োজন অনুসারে distributed services**। একেবারে শুরুতে Kubernetes, Kafka, 20টা microservice বসিয়ে দেওয়া বরং ভুল হবে।

আপনার বর্তমান repository অনুযায়ী পরের সবচেয়ে কার্যকর ধাপ হবে **ConnectU-এর জন্য একটি নতুন production-grade database schema + API architecture + folder structure + feed architecture-এর সম্পূর্ণ technical blueprint তৈরি করা**, যাতে আপনি সেটাকে সরাসরি GitHub project-এর নতুন `docs/architecture.md`, `docs/database.md`, `docs/api.md`, `docs/feed.md` হিসেবে ব্যবহার করতে পারেন।

[1]: https://firebase.google.com/docs/firestore/real-time_queries_at_scale?utm_source=chatgpt.com "Understand Real-time queries at scale  |  Firestore  |  Firebase"
[2]: https://firebase.google.com/docs/firestore/solutions/counters?authuser=2&utm_source=chatgpt.com "Distributed counters  |  Firestore  |  Firebase"
[3]: https://firebase.google.com/docs/storage/web/start?utm_source=chatgpt.com "Get started with Cloud Storage on web  |  Cloud Storage for Firebase"
[4]: https://www.postgresql.org/docs/17/ddl-partitioning.html?utm_source=chatgpt.com "PostgreSQL: Documentation: 17: 5.12. Table Partitioning"
