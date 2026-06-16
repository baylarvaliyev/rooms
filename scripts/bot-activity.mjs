/**
 * Rooms Bot Activity Script
 * Run with: node bot-activity.mjs
 * Add YOUR_SERVICE_ROLE_KEY from Supabase → Settings → API
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fmxjjwzqqjpqcyqnqzdy.supabase.co'
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const BOT_PREFIX = 'b0000001'

const POST_TEMPLATES = {
  Business: [
    "Just closed our pre-seed round. The journey from idea to first term sheet took 8 months. Happy to share what worked.",
    "Cold email vs warm intro. After 200 fundraising conversations, warm intro wins 90% of the time. Build your network early.",
    "Revenue milestone: $10k MRR! Small number for some, but for a bootstrapped founder it feels massive.",
    "Biggest lesson from year 1: ship faster. I spent 4 months building features nobody asked for.",
    "Hiring tip: your first 5 hires define your culture more than any mission statement.",
    "Your CAC will kill you before your competitors do. Obsess over unit economics from day 1.",
    "Just got rejected by 3 VCs in one day. Then got accepted to YC demo day. The rollercoaster never stops.",
    "Best founder advice I ever got: talk to 100 customers before writing a single line of code.",
  ],
  Technology: [
    "GPT-4 can write code but it still can't understand *why* the code needs to exist. That's still the human job.",
    "Hot take: most AI startups are wrappers around OpenAI with a pretty UI. The real moat is proprietary data.",
    "Rust vs Go for backend in 2025. After 2 years with both: Go for speed, Rust for performance-critical systems.",
    "Supabase just saved us $4k/month vs Firebase. Worth every migration headache.",
    "TypeScript strict mode or bust. If you're not using strict mode you're just writing JS with extra steps.",
    "Edge computing is the next big platform shift. Moving APIs to Cloudflare Workers, the latency improvement is insane.",
  ],
  Finance: [
    "Bitcoin ETF approval changed the game for institutional adoption. We're in a different cycle now.",
    "Compound interest is the 8th wonder. Maxing my retirement account since 22 — the difference at 40 is staggering.",
    "VC is dead for most founders. Revenue-based financing is much better for 80% of startups.",
    "Best hedge against inflation? Skills that compound. Invest in yourself before the S&P 500.",
  ],
  Music: [
    "Just discovered Suno AI and I have complicated feelings. The output is impressive but something feels missing.",
    "Lo-fi hip hop to study to has become a genre, a brand, and a cultural phenomenon. The internet is wild.",
    "Spotify's algorithm update destroyed independent artist discovery. Optimizing for their own playlists.",
  ],
  Study: [
    "Feynman technique changed how I learn. Explain it like you'd teach a 10-year-old. If you can't, you don't understand it.",
    "Spaced repetition + active recall = 80% of what you need for exam prep. Everything else is secondary.",
    "Most underrated study skill: knowing when to stop. Diminishing returns kick in after 90 minutes of focused work.",
  ],
  Fitness: [
    "Progressive overload is the only thing that matters for muscle growth. Everything else is optimization.",
    "Zone 2 cardio 45 min 4x week. Best thing I've done for energy levels and long-term health.",
    "Protein first every meal. If you're not hitting 1g per pound of bodyweight you're leaving gains on the table.",
    "Sleep is the original performance enhancer. 8 hours does more than any pre-workout.",
  ],
  Travel: [
    "Digital nomad reality: the wifi is never as good as the listing says. Budget 20% more for coworking spaces.",
    "Baku is underrated. The food, the history, the people. Nobody talks about Azerbaijan but they should.",
    "Slowtravel > fast travel. 3 weeks in one city vs 3 countries in 2 weeks. No comparison.",
  ],
  default: [
    "What's everyone working on this week? Drop it below 👇",
    "Controversial take: remote work made us better at async communication and worse at everything else.",
    "Building in public is terrifying and worth it. The accountability alone is worth the vulnerability.",
    "What's a skill you learned in the last year that surprised you?",
    "Unpopular opinion: most productivity advice is for people who already have good systems.",
  ]
}

const COMMENT_TEMPLATES = [
  "This is exactly what I needed to hear today.",
  "Couldn't agree more. Learned this the hard way.",
  "Great point. What's your take on the timing though?",
  "Been thinking about this exact problem. Thanks for sharing.",
  "Following for more. This is gold.",
  "How long did it take you to figure this out?",
  "Sharing this with my team immediately.",
  "This is why I love this community 🙌",
  "Just bookmarked this. Going to revisit when I'm deep in it.",
  "Spoken like someone who's actually been in the trenches.",
  "Real talk. More people need to hear this.",
  "What resources would you recommend for someone starting out?",
  "The part about unit economics really resonated with me.",
  "Counter-take: doesn't this depend heavily on your market?",
  "Been doing this for 2 years, can confirm it works.",
]

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomSubset(arr, n) { return [...arr].sort(() => 0.5 - Math.random()).slice(0, n) }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function createBotPosts() {
  console.log('📝 Creating bot posts...')
  const { data: bots } = await supabase.from('profiles').select('id').like('id', `${BOT_PREFIX}%`)
  const { data: rooms } = await supabase.from('rooms').select('id, category').limit(20)
  if (!bots?.length || !rooms?.length) return console.log('  No bots or rooms found')

  let postCount = 0
  for (const bot of bots) {
    const numPosts = Math.floor(Math.random() * 3)
    for (let i = 0; i < numPosts; i++) {
      const room = randomFrom(rooms)
      const category = room.category || 'default'
      const content = randomFrom(POST_TEMPLATES[category] || POST_TEMPLATES.default)
      const { error } = await supabase.from('posts').insert({
        content, room_id: room.id, user_id: bot.id, type: 'post',
        like_count: Math.floor(Math.random() * 12), comment_count: 0,
        created_at: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000).toISOString()
      })
      if (!error) postCount++
      await sleep(80)
    }
  }
  console.log(`  ✅ ${postCount} posts created`)
}

async function botLikeRecentPosts() {
  console.log('❤️ Bots liking recent posts...')
  const { data: bots } = await supabase.from('profiles').select('id').like('id', `${BOT_PREFIX}%`)
  const { data: posts } = await supabase.from('posts').select('id, user_id, like_count').order('created_at', { ascending: false }).limit(30)
  if (!bots?.length || !posts?.length) return

  let likeCount = 0
  const botsToLike = randomSubset(bots, Math.floor(bots.length * 0.4))
  for (const bot of botsToLike) {
    const postsToLike = randomSubset(posts, Math.floor(Math.random() * 4) + 1)
    for (const post of postsToLike) {
      if (post.user_id === bot.id) continue
      const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: bot.id })
      if (!error) {
        await supabase.from('posts').update({ like_count: (post.like_count || 0) + 1 }).eq('id', post.id)
        likeCount++
      }
      await sleep(40)
    }
  }
  console.log(`  ✅ ${likeCount} likes`)
}

async function botCommentOnPosts() {
  console.log('💬 Bots commenting...')
  const { data: bots } = await supabase.from('profiles').select('id').like('id', `${BOT_PREFIX}%`)
  const { data: posts } = await supabase.from('posts').select('id, user_id, comment_count').order('created_at', { ascending: false }).limit(20)
  if (!bots?.length || !posts?.length) return

  let commentCount = 0
  const botsToComment = randomSubset(bots, Math.floor(bots.length * 0.2))
  for (const bot of botsToComment) {
    const post = randomFrom(posts)
    if (post.user_id === bot.id) continue
    const { error } = await supabase.from('comments').insert({
      post_id: post.id, user_id: bot.id,
      content: randomFrom(COMMENT_TEMPLATES),
      created_at: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString()
    })
    if (!error) {
      await supabase.from('posts').update({ comment_count: (post.comment_count || 0) + 1 }).eq('id', post.id)
      commentCount++
    }
    await sleep(80)
  }
  console.log(`  ✅ ${commentCount} comments`)
}

async function botFollowRealUsers() {
  console.log('👤 Bots following real users...')
  const { data: bots } = await supabase.from('profiles').select('id').like('id', `${BOT_PREFIX}%`)
  const { data: realUsers } = await supabase.from('profiles').select('id').not('id', 'like', `${BOT_PREFIX}%`).limit(50)
  if (!bots?.length || !realUsers?.length) return

  let followCount = 0
  for (const user of realUsers) {
    const botsToFollow = randomSubset(bots, Math.max(1, Math.floor(bots.length * 0.25)))
    for (const bot of botsToFollow) {
      const { error } = await supabase.from('follows').insert({ follower_id: bot.id, following_id: user.id })
      if (!error) followCount++
      await sleep(20)
    }
  }
  console.log(`  ✅ ${followCount} new follows`)
}

async function botSendRoomMessages() {
  console.log('🚪 Bots sending room messages...')
  const { data: bots } = await supabase.from('profiles').select('id').like('id', `${BOT_PREFIX}%`)
  const { data: rooms } = await supabase.from('rooms').select('id').limit(15)
  if (!bots?.length || !rooms?.length) return

  const roomMessages = [
    "Hey everyone! Excited to be here 👋",
    "What's everyone working on this week?",
    "Anyone else seeing this trend? Fascinating.",
    "Just joined. This community is 🔥",
    "Great discussion! Catching up on the thread.",
    "Can someone recommend resources on this topic?",
    "Been lurking for a while, finally posting 😅",
    "This is exactly the kind of community I was looking for.",
    "Hot take: most people overthink this. Just start.",
    "Reminder that progress beats perfection every time.",
  ]

  let msgCount = 0
  const botsToMessage = randomSubset(bots, 8)
  for (const bot of botsToMessage) {
    const { error } = await supabase.from('messages').insert({
      room_id: randomFrom(rooms).id,
      user_id: bot.id,
      content: randomFrom(roomMessages),
      created_at: new Date(Date.now() - Math.random() * 3 * 60 * 60 * 1000).toISOString()
    })
    if (!error) msgCount++
    await sleep(80)
  }
  console.log(`  ✅ ${msgCount} room messages`)
}

async function run() {
  console.log('\n🤖 Bot activity cycle starting...\n')
  try {
    await createBotPosts()
    await sleep(300)
    await botLikeRecentPosts()
    await sleep(300)
    await botCommentOnPosts()
    await sleep(300)
    await botFollowRealUsers()
    await sleep(300)
    await botSendRoomMessages()
    console.log('\n✅ Done!\n')
  } catch (err) {
    console.error('Error:', err.message)
  }
  process.exit(0)
}

run()
