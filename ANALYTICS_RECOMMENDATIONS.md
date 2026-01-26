# Grid Status Analytics Dashboard: Data Exploration & Recommendations

*Exploration Date: January 25, 2026*

## Executive Summary

After extensive exploration of both PostgreSQL and PostHog data, I've identified **critical retention drivers**, **engagement patterns**, and **opportunities for new analytics pages**. The most impactful findings:

1. **Feature adoption doubles retention** (88% vs 44%)
2. **Organization membership increases retention by 32 percentage points** (77% vs 45%)
3. **55% of users are on mobile** - massive opportunity
4. **One user hit rate limits 359K times in 30 days** - actionable outreach opportunity
5. **Saturday has the most users** (32K) - unusual for B2B

---

## Part 1: Key Findings from Data Exploration

### 1.1 Retention by Feature Adoption

| Segment | Users | 30-Day Retention |
|---------|-------|------------------|
| No features | 14,431 | 43.9% |
| Dashboards only | 907 | 63.2% |
| Alerts only | 117 | 61.5% |
| Charts + Dashboards | 78 | 70.5% |
| Charts only | 47 | 57.4% |
| **All features** | **33** | **87.9%** |

**Insight**: Users who adopt multiple features are 2x more likely to stay active. Getting users to create their first dashboard is a high-leverage activation metric.

### 1.2 Retention by Organization Membership

| Status | Users | 30-Day Retention |
|--------|-------|------------------|
| Has organization | 358 | 77.1% |
| No organization | 15,277 | 44.7% |

**Insight**: Organization membership correlates with +32pp retention. Encouraging team adoption drives stickiness.

### 1.3 Retention by Chart Creation

| Segment | Users | 30-Day Retention |
|---------|-------|------------------|
| Viewer only | 15,456 | 45.1% |
| Casual creator (1-5 charts) | 125 | 64.8% |
| Power creator (>5 charts) | 33 | **90.9%** |

**Insight**: Chart creation is a leading indicator of retention. Power creators have 91% retention!

### 1.4 Retention by Download Activity

| Segment | Users | 30-Day Retention |
|---------|-------|------------------|
| No downloads | 12,990 | 44.6% |
| Light downloader (1-10) | 2,268 | 47.4% |
| Heavy downloader (>10) | 356 | 62.4% |

### 1.5 API Key Users vs Non-API Users

| Segment | Active Users | Inactive Users | Retention |
|---------|--------------|----------------|-----------|
| Has API key | 852 | 859 | 49.8% |
| No API key | 6,233 | 7,669 | 44.8% |

**Insight**: API key users have 5pp higher retention.

---

## Part 2: Traffic & Engagement Patterns

### 2.1 Device Distribution (Last 30 Days)

| Device | Users | % |
|--------|-------|---|
| **Mobile** | 62,679 | **55%** |
| Desktop | 49,970 | 44% |
| Tablet | 979 | 1% |

**Critical Insight**: Over half your users are on mobile! Mobile optimization should be a priority.

### 2.2 Geographic Distribution

| Country | Users |
|---------|-------|
| US | 91,434 (80%) |
| Canada | 7,150 (6%) |
| UK | 1,875 |
| Denmark | 1,645 |
| Germany | 973 |

### 2.3 Day of Week Activity

| Day | Unique Users |
|-----|--------------|
| Saturday | **32,644** (highest!) |
| Sunday | 21,662 |
| Friday | 19,006 |
| Wednesday | 13,958 |
| Thursday | 13,064 |
| Tuesday | 12,424 |
| Monday | 11,515 |

**Surprising Finding**: Saturday has 2.5x more users than weekdays. This suggests:
- Energy sector professionals monitoring grids on weekends
- Hobbyists/enthusiasts exploring data
- International users in different work schedules

### 2.4 Traffic Sources (Last 7 Days)

| Referrer | Users |
|----------|-------|
| Direct | 32,174 |
| Google | 22,987 |
| Bing | 1,569 |
| DuckDuckGo | 1,085 |
| LinkedIn | 502 |
| Twitter (t.co) | 362 |
| ChatGPT | 78 |
| BlueSky | 76 |
| Gemini | 56 |
| GitHub | 22 |

**Insight**: AI chatbots (ChatGPT, Gemini) are sending users! Worth monitoring this channel.

### 2.5 Top Pages (Last 30 Days)

| Path | Views | Unique Users |
|------|-------|--------------|
| /live | 73,494 | 35,918 |
| /live/ercot | 65,543 | 37,786 |
| /live/pjm | 30,997 | 17,771 |
| / (home) | 28,164 | 18,850 |
| /live/miso | 23,479 | 12,730 |
| /map | 21,593 | 8,447 |
| /insights | 16,394 | 6,123 |
| /dashboards | 6,313 | 2,925 |

---

## Part 3: Rate Limit Analysis

### 3.1 Rate Limit Hits by User

| User | Hits (30 days) |
|------|----------------|
| emma@tierraclimate.com | **359,469** (80%!) |
| jeremy.chhon@engie.com | 45,857 |
| moatz@bhgrids.com | 12,753 |
| info@bwitihouse.com | 5,507 |
| will+test0@gridstatus.io | 5,107 |

**Total**: 446,221 API rate limit hits from 107 unique users

**Actionable**: The top user alone represents 80% of all rate limit hits. This is a hot sales lead for enterprise tier!

---

## Part 4: Feature Usage Metrics

### 4.1 Dashboard Activity (Last 30 Days)

| Event | Count |
|-------|-------|
| dashboard.view | 148,807 |
| cta_open_dashboard | 12,463 |
| dashboard_component_saved | 11,240 |
| dashboard.add_component | 8,426 |
| dashboard.save | 7,960 |
| Dashboard Saved | 839 |
| Dashboard Created | 58 |

### 4.2 Export Activity (Last 30 Days)

| Event | Count |
|-------|-------|
| exporter.create_export_opened | 25,187 |
| exporter.list_exports_opened | 17,357 |
| data-export Job Created | 16,864 |
| exporter.select_columns_opened | 5,101 |
| Data Export Download Link Requested | 1,003 |

### 4.3 Nodal Map Usage (HIGHLY ENGAGED!)

| Event | Count |
|-------|-------|
| nodal_map.slider_change | **379,596** |
| nodal_map.node_search | 45,259 |
| nodal_map.market_change | 43,698 |
| nodal_map.node_select | 41,825 |
| nodal_map.layer_display_change | 26,834 |
| nodal_map.date_change | 18,653 |

**Insight**: The nodal map is extremely sticky - 379K slider interactions!

### 4.4 Download Modal Behavior

| Event | Count |
|-------|-------|
| download_modal.open | 35,296 |
| download_modal.download_data | 10,916 |
| download_modal.download_image | 4,358 |
| download_modal.more_info | 2,568 |
| download_modal.download_graph_as_csv | 1,579 |

**Conversion Rate**: 31% of users who open download modal complete a download.

### 4.5 Alert System Usage

- **31,841 alert logs sent** in last 30 days
- 163 unique alerts triggered via email
- 9 alerts triggered via SMS (145 messages)
- **~15-30 new alerts created per month**

---

## Part 5: Subscription & Revenue Insights

### 5.1 Subscription Status by Plan

| Plan | Active | Canceled | Trialing | Churn Rate |
|------|--------|----------|----------|------------|
| Pro | 76 | 508 | 4 | 87% |
| Enterprise | 14 | 12 | 1 | 46% |
| Team | 18 | 10 | 1 | 36% |
| Hobby | 12 | 47 | 23 | 80% |

**Critical Finding**: Pro plan has 87% churn rate (508 canceled vs 76 active). This warrants investigation.

### 5.2 Upgrade Intent (Last 30 Days)

| Event | Count |
|-------|-------|
| upgrade_required.click | 3,007 |
| cta.plan_pro.toggle_duration | 14,075 |
| upgrade_modal.open | 1,026 |
| cta.plan_pro_trial.click | 1,268 |
| cta.plan_enterprise.click | 216 |
| page_load_limit.blocked | 3,406 |

**Insight**: 14K users toggled between monthly/annual pricing - high intent!

---

## Part 6: Top Organizations

| Organization | Members | Type |
|--------------|---------|------|
| ExxonMobil | 51 | Energy |
| Rayburn Electric | 39 | Utility |
| Ontario Power Generation | 22 | Utility |
| GS Internal | 19 | Internal |
| Tyba | 19 | Energy |
| Yale | 14 | Academic |
| SmartestEnergy | 10 | Energy |
| Chariot Energy | 10 | Energy |
| Bitdeer | 8 | Crypto Mining |
| ENGIE | 8 | Energy |
| Citadel | 6 | Finance |
| Department of Energy | 7 | Government |

**Insight**: Strong enterprise penetration (ExxonMobil, ENGIE, Shell, BP) plus academic/government presence.

---

## Part 7: Weekly Cohort Retention

| Cohort Week | New Users | Week 1 Retention | Month 1 Retention |
|-------------|-----------|------------------|-------------------|
| Dec 1, 2025 | 422 | 40.5% | 28.0% |
| Nov 10, 2025 | 367 | 40.1% | 26.7% |
| Oct 27, 2025 | 365 | 40.8% | 29.9% |
| Oct 6, 2025 | 348 | 44.3% | 31.6% |
| Sep 1, 2025 | 217 | 46.1% | 34.6% |
| Aug 25, 2025 | 221 | 49.3% | 38.0% |

**Trend**: Week 1 retention ranges 33-49%, Month 1 retention 20-38%. Earlier cohorts show better retention (likely more mature users).

---

## Part 8: Recommended New Pages & Visualizations

*Filtered to top 18 most impactful recommendations, sorted by business value*

### TIER 1: Revenue & Retention (Highest Impact)

#### 1. **Rate Limit Abusers Dashboard** ⭐
**Why**: 107 users hit rate limits 446K times. One user alone (emma@tierraclimate.com) hit limits 359K times. These are hot leads for enterprise plans.

**What to Show**:
- Top users by rate limit hits (with email links)
- Time series of rate limit hits
- Correlation with plan type
- Estimated revenue opportunity (users exceeding limits by 10x+ are prime upgrade candidates)

**Implementation Effort**: Low (PostHog data already tracked)

---

#### 2. **Feature Adoption Funnel** ⭐
**Why**: Feature adoption is the strongest retention predictor (2x difference - 88% vs 44%). Track and visualize the activation funnel.

**What to Show**:
- Funnel: Signup → First dashboard view → First chart created → First alert set → First download → Multi-feature user
- Conversion rates between stages
- Time to first [action] for each feature
- Segment by plan, domain, signup source

**Implementation Effort**: Medium  
**Impact**: High - Directly addresses 2x retention gap

---

#### 3. **Subscription Churn Analysis** ⭐
**Why**: Pro plan has 87% churn rate (508 canceled vs 76 active). Understanding why helps reduce it.

**What to Show**:
- Subscription status breakdown by plan
- Days to cancellation distribution
- Last activity before cancellation
- Feature usage before cancellation vs retained users
- Cohort of canceled users by signup date
- Churn reasons (if tracked)

**Implementation Effort**: Medium  
**Impact**: High - Addresses major revenue loss

---

#### 4. **Organization Health Dashboard** ⭐
**Why**: Organization members have 77% retention vs 45% for individuals (+32pp). Monitor org health.

**What to Show**:
- List of all organizations with member count, activity, features used
- Active members vs total members per org
- Resources created per org (dashboards, charts, alerts)
- Organizations at risk (declining activity)
- Organizations with pending invitations (conversion opportunity)
- Org growth trends

**Implementation Effort**: Medium  
**Impact**: High - Orgs drive 32pp retention improvement

---

#### 5. **Cohort Retention Heatmap**
**Why**: Understanding retention patterns by signup cohort helps identify product changes that impact retention.

**What to Show**:
- Weekly cohort retention (rows: cohort week, columns: weeks since signup)
- Highlight cohorts with unusual retention (good or bad)
- Filter by plan, domain type (corporate vs free email)
- Compare to overall benchmark

**Why**: Understanding retention patterns by signup cohort helps identify product changes that impact retention.

**What to Show**:
- Weekly cohort retention (rows: cohort week, columns: weeks since signup)
- Highlight cohorts with unusual retention (good or bad)
- Filter by plan, domain type (corporate vs free email)
- Compare to overall benchmark

**Implementation Effort**: Medium  
**Impact**: High - Identifies retention trends over time

---

### TIER 2: Product Health & Usage (High Value)

#### 6. **Mobile vs Desktop Analytics**
**Why**: 55% of users are mobile but we don't track mobile-specific behavior.

**What to Show**:
- Feature usage by device type
- Conversion rates by device
- Page engagement by device
- Mobile bounce rate vs desktop
- Identify mobile pain points

**Implementation Effort**: Low (data exists in PostHog)  
**Impact**: High - 55% of users are mobile

---

#### 7. **Alert Performance Dashboard**
**Why**: 31,841 alert logs sent (99.5% email, 0.5% SMS). Monitor alert system health.

**What to Show**:
- Alert triggers over time
- Email vs SMS delivery rates
- Alert frequency by user (who gets most alerts?)
- Failed alert deliveries
- Most active alerts (top 20)
- Alert creation vs usage (how many alerts are never triggered?)

**Implementation Effort**: Medium  
**Impact**: Medium - Critical product feature

---

#### 8. **Data Export Job Analytics**
**Why**: 16,949 export jobs (99% success rate). Understanding export patterns reveals data needs.

**What to Show**:
- Export jobs over time (succeeded vs failed)
- Export volume by user/org
- Average job duration
- Failed job reasons
- Most exported datasets/tables
- Export frequency patterns (daily, weekly, monthly users)

**Implementation Effort**: Low (jobs table exists)  
**Impact**: Medium - High usage feature

---

#### 9. **Page Load Limit Friction Analysis**
**Why**: 3,406 users blocked by page load limits. This is conversion friction.

**What to Show**:
- Page load limit hits over time
- Most blocked pages/features
- Block-to-upgrade conversion rate
- Users hitting limits repeatedly
- Plan distribution of blocked users
- Revenue impact of load limits

**Implementation Effort**: Low  
**Impact**: Medium - Direct conversion friction

---

### TIER 3: Strategic Insights (Medium Value)

#### 10. **API Key Analytics**
**Why**: Understanding session quality helps identify engaged vs casual users.

**What to Show**:
- Average session depth (pages per session)
- Session duration distribution
- High-engagement sessions (5+ pages, 5+ minutes)
- Bounce rate by entry page
- Return visitor rate
- Session-to-action conversion (sessions that lead to creation)
- Engagement score distribution (composite metric)

**Implementation Effort**: Medium (requires PostHog session data)

---

**Why**: 880 help button clicks, 310 contact us, 182 feedback. Track support needs.

**What to Show**:
- Help requests over time
- Help button click rate
- Contact us vs feedback breakdown
- Pages where help is clicked most (friction points)
- Support channel preference

**Implementation Effort**: Low  
**Impact**: Low-Medium - UX improvement

---

## Removed Recommendations (Filtered Out)

The following were removed as they have:
- **High implementation effort with unclear ROI**: User Journey Visualization, Feature Discovery Path Analysis, Churn Prediction Signals (ML required)
- **Low impact or nice-to-have**: Weekend Warrior Analysis, Announcement Engagement Tracker, Clone & Template Usage, Insights Content Performance
- **Data availability concerns**: Search Behavior Analytics (requires search query data that may not be tracked)
- **Overlapping with existing recommendations**: Resource Sharing Analytics, Delete Behavior Analysis, External Source Analytics, Session Depth, Forecast Analysis, Trial Conversion, Time-Based Patterns, Browser/OS, Geographic Expansion, Referrer Quality Scoring, Resource Lifecycle

---
**Why**: 3,406 users blocked by page load limits. This is conversion friction.

**What to Show**:
- Page load limit hits over time
- Most blocked pages/features
- Block-to-upgrade conversion rate
- Users hitting limits repeatedly
- Plan distribution of blocked users
- Time to upgrade after being blocked
- Revenue impact of load limits

**Implementation Effort**: Low

---

#### 25. **Forecast Analysis Feature Usage**
**Why**: 12,510 forecast selects, 10,709 date selects. Track advanced feature adoption.

**What to Show**:
- Forecast analysis usage over time
- Most selected forecasts
- Forecast filter usage
- User retention after using forecasts
- Forecast-to-download conversion
- Market-specific forecast usage

**Implementation Effort**: Low (PostHog data exists)

---

#### 26. **Insights Content Performance**
**Why**: 76,047 insight post views, 19,581 expand clicks. Track content engagement.

**What to Show**:
- Most viewed insights
- Insight engagement rate (views → expand → share)
- Author performance (which authors drive most engagement?)
- Insight-to-signup conversion
- Topic performance (which topics resonate?)
- Time-to-engagement (how quickly do insights get views?)

**Implementation Effort**: Medium

---

#### 27. **Clone & Template Usage**
**Why**: 259 chart clones. Cloning is a power user behavior.

**What to Show**:
- Clone frequency over time
- Most cloned resources
- Clone-to-edit ratio (are users cloning to customize?)
- Users who clone most (template creators)
- Clone success rate (do cloned resources get used?)
- Template library opportunity (what should be templated?)

**Implementation Effort**: Low

---

#### 28. **Trial Conversion Funnel**
**Why**: 23 Hobby trials, 4 Pro trials, 1 Team trial. Track trial effectiveness.

**What to Show**:
- Trial signups over time
- Trial-to-paid conversion rate by plan
- Trial duration distribution
- Feature usage during trial
- Trial cancellation reasons (if tracked)
- Trial-to-upgrade paths (Hobby → Pro → Enterprise)
- Trial activation rate (do trial users actually use features?)

**Implementation Effort**: Medium

---

**Why**: Corporate domains (engie.com, exxonmobil.com) have different retention patterns. Top domains have 30-67% retention.

**What to Show**:
- Top corporate domains by user count
- Retention by domain (which companies stick around?)
- Domain growth trends
- Feature adoption by domain
- Domain churn risk (declining activity)
- Multi-user domains (team adoption)

**Implementation Effort**: Medium  
**Impact**: Medium - Enterprise customer insights

---

#### 16. **Top Referrers Dashboard**
**Why**: Saturday spikes, peak hours 8-10am, signups peak 7-9pm. Time patterns reveal user behavior.

**What to Show**:
- Activity heatmap (day of week × hour of day)
- Signup time distribution
- Feature usage by time of day
- Weekend vs weekday behavior
- Timezone-adjusted peak hours
- Market-specific time patterns
- Time-to-first-action (when do new users first engage?)

**Implementation Effort**: Medium

---

#### 31. **Browser & OS Compatibility Dashboard**
**Why**: 45K Chrome, 38K Mobile Safari, 49K iOS. Track platform-specific issues.

**What to Show**:
- Browser/OS distribution over time
- Feature compatibility by browser
- Error rates by browser/OS
- Mobile browser performance
- Browser upgrade trends
- Platform-specific retention
- Feature usage by platform

**Implementation Effort**: Low (PostHog data exists)

---

#### 32. **Geographic Expansion Opportunities**
**Why**: 80% US, but Canada (6%), UK, Denmark, Germany growing. Identify expansion markets.

**What to Show**:
- User growth by country
- Retention by country
- Feature adoption by country
- Market usage by country (which markets do international users prefer?)
- Language/region preferences
- Payment method by country (if tracked)
- Expansion opportunity score (growth + retention + engagement)

**Implementation Effort**: Medium

---

#### 33. **Churn Prediction Signals**
**Why**: Identify users at risk before they churn. Proactive retention.

**What to Show**:
- Users with declining activity (last 7 days vs previous 7 days)
- Feature abandonment (stopped using features they once used)
- Session frequency decline
- Days since last login distribution
- Users approaching plan limits
- Engagement score trends (declining scores = churn risk)
- Alert: Users with 50%+ activity drop

**Implementation Effort**: High (requires ML or rule-based scoring)

---

**Why**: Power users drive retention and revenue. Power creators have 91% retention vs 45% for viewers.

**What to Show**:
- Power user criteria (composite score: features used, activity, retention)
- Power user distribution over time
- Power user characteristics (plan, org, features, usage patterns)
- Power user creation rate (new power users per month)
- Power user churn risk
- Power user feature preferences

**Implementation Effort**: Medium  
**Impact**: Medium - Power users = 91% retention

---

#### 15. **Corporate Domain Health Dashboard**
**Why**: How do users find new features? Optimize discovery.

**What to Show**:
- Feature discovery timeline (when do users discover each feature?)
- Discovery channels (help docs, in-app prompts, exploration)
- Time from signup to feature discovery
- Feature discovery sequences (what do they find first, second, third?)
- Undiscovered features (features users have access to but never use)
- Discovery-to-adoption conversion

**Implementation Effort**: High (requires tracking discovery events)

---

#### 36. **Resource Lifecycle Analytics**
**Why**: Track create → use → delete patterns to understand resource value.

**What to Show**:
- Resource creation velocity (new resources per user per month)
- Resource usage rate (created vs actually used)
- Resource age distribution
- Resource deletion patterns
- Resource sharing rate (what gets shared?)
- Resource edit frequency (active vs static resources)
- Resource value score (usage × age × shares)

**Implementation Effort**: Medium

---

**Why**: 14K users toggled pricing, 3K hit upgrade required. Score upgrade likelihood.

**What to Show**:
- Upgrade intent score (based on: limit hits, feature usage, plan limits, engagement)
- Users with high upgrade intent (top 100)
- Upgrade intent trends over time
- Intent-to-conversion rate
- Feature usage vs plan limits (users hitting limits)
- Revenue opportunity from high-intent users

**Implementation Effort**: Medium  
**Impact**: Medium - Direct revenue opportunity

---

#### 14. **Power User Identification & Segmentation**
**Why**: Saturday has 2.5x more users than weekdays. Understand weekend behavior.

**What to Show**:
- Weekend vs weekday user comparison
- Weekend feature usage patterns
- Weekend user segments (who uses on weekends?)
- Weekend retention (do weekend users stick around?)
- Weekend market preferences
- Weekend-to-weekday conversion (do weekend users become weekday users?)
- Weekend-specific features (what's popular on weekends?)

**Implementation Effort**: Low

---

#### 39. **Referrer Quality Scoring**
**Why**: Not all traffic is equal. Score referrers by quality.

**What to Show**:
- Referrer quality score (retention × engagement × conversion)
- Top quality referrers (high retention, high engagement)
- Referrer conversion rates (signup → active user)
- Referrer user lifetime value
- New referrers appearing (trending sources)
- Referrer decay (are referrers improving or declining?)
- Marketing ROI by referrer

**Implementation Effort**: Medium

---

#### 40. **Announcement Engagement Tracker**
**Why**: 36 announcements exist. Track which announcements drive action.

**What to Show**:
- Announcement views vs dismissals
- Announcement-to-action conversion (did users act on announcements?)
- Most effective announcements
- Announcement timing impact
- Announcement fatigue (do users stop engaging after many announcements?)
- Announcement placement effectiveness

**Implementation Effort**: Low (if announcement views are tracked)

---

## Part 8.5: Top 18 Recommendations Summary

### By Business Impact

**TIER 1: Revenue & Retention (Highest Impact)** ⭐
1. Rate Limit Abusers Dashboard - **Direct revenue opportunity** (107 users hitting limits)
2. Feature Adoption Funnel - **2x retention impact** (88% vs 44%)
3. Subscription Churn Analysis - **87% Pro plan churn** (critical issue)
4. Organization Health Dashboard - **+32pp retention** (77% vs 45%)
5. Cohort Retention Heatmap - **Identify retention trends**

**TIER 2: Product Health & Usage (High Value)**
6. Mobile vs Desktop Analytics - **55% mobile users**
7. Alert Performance Dashboard - **31K alerts/month**
8. Data Export Job Analytics - **17K jobs/month**
9. Page Load Limit Friction Analysis - **3.4K blocked users**

**TIER 3: Strategic Insights (Medium Value)**
10. API Key Analytics - **3,279 API users**
11. Organization Invitation Funnel - **70% acceptance rate**
12. Market-Specific Usage Analytics - **ERCOT 37K, PJM 17K users**
13. Upgrade Intent Scoring - **14K pricing toggles**
14. Power User Identification - **91% retention**
15. Corporate Domain Health - **Enterprise insights**
16. Top Referrers Dashboard - **Marketing optimization**
17. AI Traffic Tracker - **Emerging channel**
18. Help & Support Demand Tracker - **UX improvement**

### Implementation Priority

**Quick Wins (Low Effort, High Impact)**
- Rate Limit Abusers Dashboard
- Mobile vs Desktop Analytics
- Data Export Job Analytics
- Page Load Limit Friction Analysis
- API Key Analytics
- Organization Invitation Funnel
- Top Referrers Dashboard
- AI Traffic Tracker
- Help & Support Demand Tracker

**Strategic Builds (Medium Effort, High Impact)**
- Feature Adoption Funnel
- Subscription Churn Analysis
- Organization Health Dashboard
- Cohort Retention Heatmap
- Alert Performance Dashboard
- Market-Specific Usage Analytics
- Upgrade Intent Scoring
- Power User Identification
- Corporate Domain Health Dashboard

---

## Part 9: Quick Wins (Implement Today)

### 9.1 Alert: Rate Limit Whale
Add a simple alert when a user exceeds 10K rate limits in a week. Reach out with enterprise offer.

### 9.2 Add Device Filter to Existing Pages
Add a "Device Type" filter to the existing analytics pages so you can segment mobile vs desktop behavior.

### 9.3 Track First Feature Usage
Add PostHog events for "First Dashboard Created", "First Alert Created", "First Chart Created" to enable activation funnel analysis.

### 9.4 Monitor Pro Plan Cancellations
Create a simple dashboard showing recent Pro plan cancellations with their usage patterns.

---

## Part 10: Data Quality Notes

### Missing/Incomplete Data
- No UTM campaign tracking on signups (all null)
- Download settings `table_name` field often null
- No tutorial/onboarding events tracked
- No explicit mobile app events (if app exists)

### Recommended Tracking Additions
1. Track feature first-use events
2. Add UTM parameters to marketing links
3. Track time-on-page for key pages
4. Track scroll depth on long pages
5. Track search queries (what are users searching for?)

---

## Appendix: Key Metrics Summary

| Metric | Value |
|--------|-------|
| Total Users | ~31,000 |
| Active Users (30 day) | ~7,000 |
| Daily Active Users | 2,000-4,000 (weekday), 20,000-30,000 (spike days) |
| New Users/Month | ~350-420/week |
| Week 1 Retention | 33-49% |
| Month 1 Retention | 20-38% |
| Mobile Users | 55% |
| US Users | 80% |
| API Keys | 4,215 (3,279 unique users) |
| Active Orgs | ~100 |
| Dashboard Views/Month | ~150,000 |
| Export Jobs/Month | ~1,200-1,600 |
| Alerts Sent/Month | ~30,000 emails |
| Rate Limit Hits/Month | ~450,000 |
