# Loyalty Dashboard — Project Rules for Claude

## Architecture
- Single-file static HTML app: `index.html`
- Runs on GitHub Pages (no server)
- Supabase REST API for data persistence (3 tables: contacts, point_report, redemptions)
- All dashboard state lives in global `D` object, serialized to `ld_computed` localStorage

## Critical: Export HTML sync rule

**Every time you change panel HTML structure** (add/remove/rename any `<div id="...">` inside panels p2–p5), you MUST also update the `panelsHtml` template string inside `exportAsHTML()` (~line 2170).

Reason: `exportAsHTML` has a separate hardcoded copy of the panel HTML. If the main HTML and `panelsHtml` drift, the exported file will crash silently — render functions reference elements that don't exist.

Example of past bug: `inactiveSection` existed in main HTML but not in `panelsHtml` → `renderP2` crashed → panels 2, 3, 4 never rendered.

**Rule: after any panel HTML edit, grep for the element ID in `exportAsHTML` and confirm it's present.**

## Render function dependencies
- `renderP2` → references `inactiveSection` (exists in main HTML, skip with `if(!el) return` in export)
- `renderP3` → requires `D.s3` (from point_report data)
- `renderP4` → requires `D.s4a` (from point_report data)
- `renderP5` → requires `D.s5` (from redemptions data)

## Data flow
1. Excel upload → `storeContacts/storePointReport/storeRedemptions` → localStorage
2. localStorage → `recomputeAndRender()` → `D` object → render panels
3. `exportAsHTML()` → reads current `D` in memory → embeds as JSON → no Supabase fetch

## Month filtering
- Current month is always excluded from New User chart: `r.regDate < curPeriod`
- `total_active` counts only ACTIVE members with valid regDate AND not current month
