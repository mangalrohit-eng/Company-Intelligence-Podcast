# Default Topics and Priority Weights

## Available Topics

The system supports the following topics with their default priority weights:

| Topic ID | Topic Name | Default Priority | Priority Level |
|----------|------------|------------------|----------------|
| `company-news` | Company News & Announcements | **3** | High |
| `earnings` | Earnings & Financial Results | **3** | High |
| `product-launches` | Product Launches | **3** | High |
| `mergers-acquisitions` | Mergers & Acquisitions | **3** | High |
| `competitor-analysis` | Competitive Intelligence | **2** | Medium |
| `industry-trends` | Industry Trends & Market Analysis | **2** | Medium |
| `technology` | Technology & Innovation | **2** | Medium |
| `partnerships` | Strategic Partnerships | **2** | Medium |
| `regulatory` | Regulatory & Legal Developments | **2** | Medium |
| `leadership` | Leadership & Executive Changes | **1** | Low |

## Priority Weight System

- **Priority 3 (High)**: Gets the most evidence units and time allocation
- **Priority 2 (Medium)**: Standard allocation
- **Priority 1 (Low)**: Gets the least evidence units and time allocation

### How Priority Affects Allocation

In the **Prepare Stage**, evidence units are allocated proportionally based on priority:

```
Total Evidence Units = round(duration_minutes * 2)
Topic Allocation = (Topic Priority / Sum of All Priorities) * Total Evidence Units
```

**Example for 5-minute podcast with 3 topics:**
- `company-news` (priority 3)
- `competitor-analysis` (priority 2)
- `industry-trends` (priority 2)

Total priority = 3 + 2 + 2 = 7
Total evidence units = 5 * 2 = 10

- `company-news`: (3/7) * 10 = ~4 units
- `competitor-analysis`: (2/7) * 10 = ~3 units
- `industry-trends`: (2/7) * 10 = ~3 units

## Default Topics for "I'm Feeling Lucky"

When using the **"I'm Feeling Lucky"** button, these 3 topics are selected by default:

1. **`company-news`** - Priority: **3** (highest)
2. **`competitor-analysis`** - Priority: **2**
3. **`industry-trends`** - Priority: **2**

## Fallback Defaults

If no topics are configured, the system falls back to:

```typescript
['company-news', 'competitor-analysis', 'industry-trends']
```

With default priorities:
- `company-news`: 3
- `competitor-analysis`: 2
- `industry-trends`: 2

## Custom Priority Weights

When creating a podcast, you can override the default priorities:

- If a topic has a custom priority in `topicPriorities`, that value is used
- Otherwise, the default priority from the topic map is used
- If a topic is not in the map, it defaults to priority **2**

### Example: Custom Priorities

```json
{
  "topics": ["company-news", "earnings", "leadership"],
  "topicPriorities": {
    "company-news": 5,  // Custom: higher than default (3)
    "earnings": 3,      // Default: same as default (3)
    "leadership": 2     // Custom: higher than default (1)
  }
}
```

## Code Location

**File:** `src/app/api/podcasts/[id]/runs/route.ts`

**Function:** `mapTopicsToStandard()`

```typescript
const topicMap: Record<string, { name: string; priority: number }> = {
  'company-news': { name: 'Company News & Announcements', priority: 3 },
  'competitor-analysis': { name: 'Competitive Intelligence', priority: 2 },
  'industry-trends': { name: 'Industry Trends & Market Analysis', priority: 2 },
  'earnings': { name: 'Earnings & Financial Results', priority: 3 },
  'product-launches': { name: 'Product Launches', priority: 3 },
  'technology': { name: 'Technology & Innovation', priority: 2 },
  'partnerships': { name: 'Strategic Partnerships', priority: 2 },
  'leadership': { name: 'Leadership & Executive Changes', priority: 1 },
  'mergers-acquisitions': { name: 'Mergers & Acquisitions', priority: 3 },
  'regulatory': { name: 'Regulatory & Legal Developments', priority: 2 },
};
```

## Priority Weight in Database

When topics are stored in DynamoDB (`podcast_topics` table), they use `priorityWeight` (0-100 scale) instead of priority (1-3 scale):

- **Priority 3** → `priorityWeight: 50` (default if not specified)
- **Priority 2** → `priorityWeight: 50` (default if not specified)
- **Priority 1** → `priorityWeight: 50` (default if not specified)

The mapping from `priorityWeight` to `priority` happens in the pipeline:
- If `priorityWeight` is provided, it's converted to priority (1-3 scale)
- Otherwise, the default priority from the topic map is used

## Summary

- **10 available topics** with default priorities ranging from 1-3
- **"I'm Feeling Lucky"** uses 3 topics: company-news (3), competitor-analysis (2), industry-trends (2)
- **Priority 3** topics get the most content allocation
- **Priority 1** topics get the least content allocation
- Custom priorities can override defaults when creating a podcast

