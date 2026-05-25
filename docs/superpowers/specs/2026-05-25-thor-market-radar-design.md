# Thor Market Radar Web Redesign

Data: 2026-05-25  
Status: approved visual direction, pending implementation approval  
Approved concept: `docs/design/assets/thor-market-radar-concept.png`

## 1. Goal

Replace the current spatial canvas with a premium “Thor Market Radar” interface focused on market scanning, source health, deal opportunities, tenant workflow, and index + link compliance.

The new UI must feel like an operational radar for Romanian real-estate agencies, not a generic admin dashboard. It should make the product’s value obvious in the first viewport:

- listings are indexed and deduplicated into canonical records;
- the product links back to source portals and does not re-host full portal content;
- agents can act on listings through tenant-scoped workflow;
- source health, crawl events, alerts, and dedup signals are visible.

## 2. Visual Direction

The accepted direction is a dark, high-contrast B2B SaaS command surface:

- dark navy / graphite background;
- electric cyan and violet accents;
- subtle glass panels with refined borders;
- tactical map/radar as the primary surface;
- dense but readable cards, KPIs, and activity timeline;
- no overlapping chrome, no generic card grid, no photo-dependent design.

Primary copy anchors:

- `THOR CRM Index + Link`
- `Nu republicăm conținut. Linkăm la sursă.`
- `Market Radar · București`
- `Oportunități fierbinți`
- `Health surse`
- `Dedup score`
- `Istoric preț`
- `Workflow agenție`

## 3. Information Architecture

### App Shell

Use a fixed-height desktop shell with responsive fallback:

- left slim sidebar;
- top filter and command bar;
- center radar map and operational timeline;
- right opportunity/detail panel;
- bottom KPI strip.

Mobile and tablet collapse into stacked sections in this order:

1. command/search;
2. hot opportunities;
3. radar map;
4. selected listing inspector;
5. timeline;
6. KPIs;
7. source health.

### Navigation

Sidebar items:

- `Radar`
- `Anunțuri`
- `Căutări salvate`
- `Alerte`
- `Surse`
- `Dedup`
- `Setări`

Only `Radar` needs to be fully active in this slice. Other items can be non-routing buttons for now, but must look intentional.

## 4. Screen Composition

### Top Command Bar

Controls:

- location select, default `București`;
- property type select, default `Toate tipurile`;
- transaction select, default `Vânzare + Închiriere`;
- price range inputs, placeholders `Min` and `Max`;
- command search, placeholder `Caută anunțuri, zone, surse...`;
- advanced filters button with count;
- `Start scan` action wired to the existing refresh handler.

Search keeps the existing listing filtering behavior.

### Radar Map

The map is code-native SVG/CSS, not an external map dependency in this slice.

Required visual elements:

- stylized Bucharest street/grid background;
- neighborhood labels: `Băneasa`, `Floreasca`, `Pipera`, `Titan`, `Dristor`, `Rahova`, `Drumul Taberei`;
- cluster circles with counts and trend deltas;
- red/orange heat glow for price-change cluster around `Titan`;
- cyan/blue clusters for stable or positive activity;
- map controls for zoom/layers/share as visual controls;
- `Heatmap: Preț schimbat` selector.

Clicking a cluster selects the representative listing for that area when available. If no listing exists for a cluster, it selects a cluster summary card.

### Source Health Overlay

Display source health directly on the radar surface:

- source name;
- mode/status color;
- parse success rate;
- degraded source warning when applicable.

Data maps from existing `SourceHealth`:

- `mode`;
- `parseSuccessRate`;
- `fieldCoverageRate`;
- `timeToIndexMinutes`.

### Hot Opportunities Panel

Right panel shows up to four listing cards.

Each card includes:

- title;
- neighborhood/city;
- price;
- area and rooms;
- price delta if `changedToday`;
- `Dedup score`;
- source badges;
- `Index + link` / `Link sursă` action.

Cards must not show full portal descriptions or re-hosted images. Any illustration is abstract/vector only.

### Selected Detail Drawer

Below hot opportunities on desktop, or after radar on mobile:

- selected listing or cluster title;
- normalized fields;
- source links;
- price history mini-chart;
- workflow controls:
  - status buttons or select;
  - assignee label;
  - tags;
  - note input;
- compliance note: `Index + link: trimitem către sursa originală.`

Existing workflow handlers remain the source of truth:

- `onWorkflowStatusChange`;
- `onWorkflowNoteCreate`.

### Activity Timeline

Show an operational strip with simulated/current data:

- alert sent;
- match created;
- parse OK;
- fetched;
- crawl OK;
- source degraded.

The timeline can be derived from:

- `alertDeliveries`;
- selected listing history;
- `sourceHealth` degraded/off state.

### KPI Strip

KPIs:

- canonical listings count;
- new today;
- price changed;
- dedup candidates;
- alerts sent;
- source parse coverage;
- average time-to-index.

Where backend values are unavailable, derive values from the current loaded demo/API arrays and label them as dashboard metrics, not guaranteed production analytics.

## 5. Component Plan

Create a new feature folder:

`apps/web/src/radar/`

Recommended components:

- `MarketRadarAppShell.tsx`
- `RadarSidebar.tsx`
- `RadarCommandBar.tsx`
- `MarketMap.tsx`
- `SourceHealthOverlay.tsx`
- `HotOpportunitiesPanel.tsx`
- `RadarListingCard.tsx`
- `SelectedListingDrawer.tsx`
- `ActivityTimeline.tsx`
- `RadarKpiStrip.tsx`
- `radarModel.ts`
- `radarStyles.css`

`App.tsx` should render `MarketRadarAppShell` instead of `SpatialAppShell`.

The old spatial components can remain in the repository during this slice unless deletion is necessary to avoid confusion. Tests should target the new radar shell as the primary surface.

## 6. Data Model Mapping

Use existing frontend data first:

- `DemoListing[]` for opportunities, selected listing, source badges, price history, and listing metrics;
- `SourceHealth[]` for health overlay and source status;
- `SavedSearch[]` for saved-search counts and alert context;
- `AlertDelivery[]` for timeline and KPI metrics;
- `TenantWorkflowItem[]` for selected listing workflow state.

Add frontend-only derived model helpers in `radarModel.ts`:

- `buildRadarViewModel`;
- `buildRadarClusters`;
- `buildRadarKpis`;
- `buildActivityEvents`;
- `filterRadarListings`.

No schema migration is required for this redesign.

## 7. Interactions

Required:

- command search filters opportunities and selected list candidates;
- `Start scan` calls existing refresh listings handler;
- clicking a hot opportunity selects it;
- clicking a cluster selects the representative listing/cluster;
- source links open external source URLs in a new tab with `rel="noreferrer"`;
- workflow status and note creation use existing handlers;
- saved-search and auth UI can be minimized into the detail/workspace area if still needed for existing tests.

Not required in this slice:

- real map provider;
- route navigation for sidebar items;
- live WebSocket updates;
- production email/webhook delivery UI.

## 8. Accessibility and Responsiveness

Requirements:

- semantic landmarks for sidebar, command bar, map, opportunities, detail, timeline, KPIs;
- keyboard-accessible listing cards and cluster buttons;
- visible focus states;
- sufficient contrast on dark UI;
- mobile layout without horizontal overflow;
- source links and workflow actions have accessible labels.

## 9. Testing

Update or add tests for:

- app renders `Thor Market Radar` as the primary web surface;
- command search filters hot opportunities;
- selected listing drawer shows index + link source URLs;
- workflow status and note actions remain available;
- source health overlay renders parse coverage and degraded state;
- mobile stack landmarks are present.

Required validation before PR:

- `npm test`
- `npm run typecheck`
- `npm run build`
- browser screenshot at desktop and mobile sizes.

## 10. Acceptance Criteria

The redesign is done when:

- the first viewport resembles the approved concept closely enough for product review;
- no major panels overlap at common desktop widths;
- mobile has no horizontal clipping;
- the product clearly communicates `index + link`;
- external source links remain links, not copied portal content;
- tenant workflow still works;
- source health and operational timeline are visible;
- CI checks pass.
