# Dashboard Transformation Example

## Current State (Problem)

When authenticated users visit `/`, they see:
- Marketing hero section ("Turn Your Company News Into a Podcast")
- Features section
- Demo player
- "How It Works" section
- CTA buttons

**Problem**: This is marketing content, not useful for users who are already logged in and want to work.

---

## Proposed Dashboard (Solution)

When authenticated users visit `/`, they should see a **functional dashboard** with:

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Header                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Total        │  │ Active       │  │ Episodes     │      │
│  │ Podcasts: 5  │  │ Runs: 2      │  │ This Month:  │      │
│  │              │  │              │  │ 12           │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Quick Actions                                               │
│  [Create Podcast] [View All Podcasts] [Recent Episodes]    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│  Recent Podcasts          │  │  Activity Feed           │
│  ┌────────────────────┐   │  │  ┌────────────────────┐  │
│  │ Podcast 1          │   │  │  │ Run completed      │  │
│  │ Last run: 2h ago  │   │  │  │ 2 hours ago        │  │
│  │ [Run Now] [View]  │   │  │  └────────────────────┘  │
│  └────────────────────┘   │  │  ┌────────────────────┐  │
│  ┌────────────────────┐   │  │  │ New episode        │  │
│  │ Podcast 2          │   │  │  │ published          │  │
│  │ Last run: 1d ago   │   │  │  │ 5 hours ago        │  │
│  │ [Run Now] [View]  │   │  │  └────────────────────┘  │
│  └────────────────────┘   │  │                          │
│  [View All →]              │  │  [View All Activity →]   │
└──────────────────────────┘  └──────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│  Upcoming Runs            │  │  Recent Episodes          │
│  ┌────────────────────┐   │  │  ┌────────────────────┐  │
│  │ Daily Brief -       │   │  │  │ Episode Title 1    │  │
│  │ Tomorrow 9:00 AM   │   │  │  │ 5 min • 2h ago    │  │
│  └────────────────────┘   │  │  │ [Play] [View]       │  │
│  ┌────────────────────┐   │  │  └────────────────────┘  │
│  │ Weekly Analysis -  │   │  │  ┌────────────────────┐  │
│  │ Friday 10:00 AM    │   │  │  │ Episode Title 2    │  │
│  └────────────────────┘   │  │  │ 8 min • 1d ago     │  │
│                           │  │  │ [Play] [View]       │  │
│  [View Schedule →]         │  │  └────────────────────┘  │
└──────────────────────────┘  │  [View All Episodes →]    │
                               └──────────────────────────┘
```

---

## Detailed Component Breakdown

### 1. Stats Cards (Top Row)
```tsx
<StatsGrid>
  <StatCard 
    label="Total Podcasts" 
    value={5} 
    icon={<Mic />}
    link="/podcasts"
  />
  <StatCard 
    label="Active Runs" 
    value={2} 
    icon={<Play />}
    link="/podcasts?filter=active"
  />
  <StatCard 
    label="Episodes This Month" 
    value={12} 
    icon={<Radio />}
    link="/episodes"
  />
  <StatCard 
    label="Total Episodes" 
    value={47} 
    icon={<TrendingUp />}
    link="/episodes"
  />
</StatsGrid>
```

### 2. Quick Actions Bar
```tsx
<QuickActions>
  <Button href="/podcasts/new">
    <Plus /> Create New Podcast
  </Button>
  <Button href="/podcasts">
    <Mic /> View All Podcasts
  </Button>
  <Button href="/episodes">
    <Radio /> Recent Episodes
  </Button>
  <Button href="/podcasts?filter=running">
    <Play /> Active Runs
  </Button>
</QuickActions>
```

### 3. Recent Podcasts Section
Shows 3-5 most recently updated podcasts with:
- Podcast title and cover art
- Last run timestamp
- Status badge
- Quick actions: "Run Now", "View", "Settings"

### 4. Activity Feed
Shows recent activity:
- "Run completed for [Podcast Name]"
- "New episode published: [Episode Title]"
- "Podcast [Name] created"
- "Run started for [Podcast Name]"
- Timestamps for each activity
- Links to relevant pages

### 5. Upcoming Scheduled Runs
Shows next scheduled runs:
- Podcast name
- Scheduled time
- Countdown ("in 2 hours", "tomorrow")
- Option to view/edit schedule

### 6. Recent Episodes
Shows 3-5 most recent episodes:
- Episode title
- Podcast name
- Duration
- Publish date
- Quick play button
- Link to episode detail

---

## Benefits

1. **Immediate Value**: Users see their content immediately
2. **Quick Access**: Common actions are one click away
3. **Context**: Users understand what's happening across all podcasts
4. **Efficiency**: No need to navigate to see recent activity
5. **Engagement**: Encourages users to interact with their content

---

## Implementation

The dashboard should:
- Only show for authenticated users
- Show marketing landing page for unauthenticated users
- Be responsive (mobile-friendly)
- Load data efficiently (maybe show skeleton loaders)
- Allow customization (user preferences for what to show)

---

## Example Code Structure

```tsx
export default function Home() {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  if (!isAuthenticated) {
    return <MarketingLandingPage />;
  }

  return <Dashboard />;
}

function Dashboard() {
  const { podcasts, episodes, runs, activity } = useDashboardData();

  return (
    <div className="dashboard">
      <StatsGrid data={stats} />
      <QuickActions />
      <div className="grid grid-cols-2">
        <RecentPodcasts podcasts={podcasts} />
        <ActivityFeed activities={activity} />
      </div>
      <div className="grid grid-cols-2">
        <UpcomingRuns runs={scheduledRuns} />
        <RecentEpisodes episodes={episodes} />
      </div>
    </div>
  );
}
```

This transforms the landing page from marketing content into a **productive workspace** for authenticated users.

