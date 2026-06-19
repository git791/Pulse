# PULSE
### *Technical Design Document*
**Architecture, Simulation Engine & Antigravity Build Plan**

Companion to: Pulse PRD v1.0
Target build environment: Google Antigravity 2.0
Version 1.0 | June 2026

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Model](#2-data-model)
3. [The Causal Simulation Engine](#3-the-causal-simulation-engine)
4. [The Carbon Twin Renderer](#4-the-carbon-twin-renderer)
5. [Multimodal Ingestion Pipeline (P1)](#5-multimodal-ingestion-pipeline-p1)
6. [Technology Stack](#6-technology-stack)
7. [Antigravity-Specific Build & Orchestration Plan](#7-antigravity-specific-build--orchestration-plan)
8. [UI Sourcing Strategy](#8-ui-sourcing-strategy-where-the-polished-chrome-should-come-from)
9. [Deployment & Demo-Day Readiness](#9-deployment--demo-day-readiness)

---

## 1. System Architecture Overview

Pulse is architected as a client-heavy single-page application with optional thin serverless functions for multimodal extraction. The decision to push the simulation engine and renderer entirely to the client is deliberate: it removes network latency from the demo's most important moment (the live fork), and it means the core wow-factor works identically whether judges are on venue WiFi or offline.

### 1.1 High-Level Component Map

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                       │
│                                                              │
│  ┌────────────┐   ┌──────────────────┐   ┌───────────────┐ │
│  │  Capture    │──▶│  Ingestion        │──▶│  Activity      │ │
│  │  Surface    │   │  Normalizer        │   │  Event Store   │ │
│  │ (tap/photo/ │   │ (schema mapper)    │   │ (local state)  │ │
│  │  voice)     │   └──────────────────┘   └───────┬───────┘ │
│  └────────────┘                                    │         │
│                                                     ▼         │
│                                       ┌──────────────────────┐│
│                                       │  Causal Simulation    ││
│                                       │  Engine (state-space  ││
│                                       │  + forking)           ││
│                                       └──────────┬───────────┘│
│                                                   │            │
│                                                   ▼            │
│                                       ┌──────────────────────┐│
│                                       │  Carbon Twin          ││
│                                       │  Renderer (SVG/WebGL) ││
│                                       └──────────────────────┘│
└──────────────────────────┬─────────────────────────────────────┘
                            │ (only for P1 multimodal extraction)
                            ▼
              ┌───────────────────────────┐
              │  Serverless Function        │
              │  (multimodal LLM call:      │
              │   photo → line items,        │
              │   speech → transcript→event) │
              └───────────────────────────┘
```

### 1.2 Why Client-Side Simulation, Not Server-Side

- **Latency:** forking must feel instantaneous (sub-1-second) for the demo's emotional impact; a round-trip to a server risks visible lag at the worst possible moment.
- **Reliability:** venue WiFi at hackathons is notoriously unreliable; a client-side core means the P0 demo path never depends on network availability.
- **Cost & scope:** a 1–2 day build has no time to harden a stateful backend; pushing logic to the client removes an entire category of infrastructure work.
- This does not block a future product: the simulation engine is a pure, serializable function of state, so it can be lifted server-side later (e.g., for cross-device sync) without a rewrite.

---

## 2. Data Model

### 2.1 Activity Event (the universal schema all input modes normalize to)

```typescript
interface ActivityEvent {
  id: string;
  timestamp: string;          // ISO 8601
  category: 'transport' | 'food' | 'energy' | 'consumption';
  subtype: string;            // e.g. 'flight', 'beef', 'grid_electricity'
  quantity: number;           // e.g. miles, kg, kWh — unit defined by subtype
  unit: string;
  source: 'manual' | 'photo' | 'voice';
  confidence: number;         // 0–1, set to 1.0 for manual taps
  co2_kg: number;             // computed at ingestion time
}
```

### 2.2 Habit State Vector (drives the simulation)

```typescript
interface HabitState {
  commute: { mode: 'car'|'transit'|'bike'|'walk'|'mixed'; daysPerWeek: number; distanceKm: number };
  diet: { profile: 'omnivore_high'|'omnivore_avg'|'flexitarian'|'vegetarian'|'vegan' };
  energy: { source: 'grid_avg'|'grid_renewable'|'mixed'; homeSizeFactor: number };
  consumption: { intensityIndex: number };  // 0–1 normalized shopping/consumption rate
}
```

### 2.3 Simulation Trajectory Output

```typescript
interface TrajectoryPoint { monthIndex: number; cumulativeCo2Kg: number; rateKgPerMonth: number; }
interface Trajectory {
  id: string;
  label: 'baseline' | 'hypothetical';
  forkedFromMonth?: number;     // present only on hypothetical branches
  points: TrajectoryPoint[];    // 60 points = 5-year monthly horizon
}
```

---

## 3. The Causal Simulation Engine

This is the component judges will probe hardest, since it's the basis of the entire differentiation claim. The design goal is not scientific precision — it's a transparent, explainable causal model that is meaningfully different from a static multiplier table, while remaining implementable in a few hours.

### 3.1 Design Principle: State-Space Model, Not Lookup Table

Conventional calculators compute: `total_co2 = sum(activity_quantity × emission_factor)`. This is accounting, not simulation — it has no concept of "what happens next" or "what if." Pulse instead defines a monthly emission rate as a function of the current HabitState, and projects that rate forward, allowing the rate itself to drift slightly over time (modeling habit decay/momentum) rather than staying perfectly flat.

### 3.2 Core Model

```typescript
function monthlyRateKg(state: HabitState): number {
  const commute = COMMUTE_FACTOR[state.commute.mode]
                  * state.commute.distanceKm * state.commute.daysPerWeek * 4.33;
  const diet    = DIET_FACTOR[state.diet.profile] * 30;
  const energy  = ENERGY_FACTOR[state.energy.source] * state.energy.homeSizeFactor;
  const goods   = CONSUMPTION_BASE * state.consumption.intensityIndex;
  return commute + diet + energy + goods;
}

function projectTrajectory(state: HabitState, horizonMonths = 60,
                            momentum = 0.0): Trajectory {
  const points: TrajectoryPoint[] = [];
  let cumulative = 0;
  for (let m = 0; m < horizonMonths; m++) {
    // momentum models gradual real-world drift (e.g. slow habit reversion)
    const rate = monthlyRateKg(state) * (1 + momentum * m / horizonMonths);
    cumulative += rate;
    points.push({ monthIndex: m, cumulativeCo2Kg: cumulative, rateKgPerMonth: rate });
  }
  return { id: uid(), label: 'baseline', points };
}
```

### 3.3 Forking — The Core Demo Mechanic

A fork takes the current trajectory at month k, clones the HabitState, applies a proposed delta, and projects a second trajectory from that point forward. Both trajectories share their history up to the fork point and diverge after it — this shared-then-diverging shape is exactly what gets rendered as two branches splitting from one organism.

```typescript
function forkTrajectory(baseline: Trajectory, currentState: HabitState,
                         delta: Partial<HabitState>, atMonth: number): Trajectory {
  const newState = deepMerge(currentState, delta);
  const remaining = projectTrajectory(newState, 60 - atMonth);
  const sharedHistory = baseline.points.slice(0, atMonth);
  const offset = sharedHistory.at(-1)?.cumulativeCo2Kg ?? 0;
  const forkedPoints = remaining.points.map(p => ({
    ...p, monthIndex: p.monthIndex + atMonth, cumulativeCo2Kg: p.cumulativeCo2Kg + offset
  }));
  return { id: uid(), label: 'hypothetical', forkedFromMonth: atMonth,
           points: [...sharedHistory, ...forkedPoints] };
}
```

### 3.4 Grounding the Constants

`COMMUTE_FACTOR`, `DIET_FACTOR`, `ENERGY_FACTOR`, and `CONSUMPTION_BASE` should be seeded from publicly published average emissions figures (the kind found in EPA and DEFRA per-activity emission factor tables) so the model is defensible if a judge asks "where do these numbers come from." Precision is not the goal; plausibility and transparency are.

> **Engineering note:** Keep the entire engine in one pure, dependency-free TypeScript module with no DOM or React imports. This makes it trivially unit-testable in isolation and reusable if the renderer is swapped or the engine is later lifted server-side.

---

## 4. The Carbon Twin Renderer

### 4.1 Rendering Approach

The organism is generated procedurally from numeric trajectory state — never hand-illustrated or templated per-user. Recommended approach for a 1–2 day build: an SVG-based generative branching structure (a recursive L-system or simple recursive branch-drawing algorithm), animated via CSS custom properties and `requestAnimationFrame`, rather than a full WebGL/Three.js pipeline. SVG is faster to build, easier for an Antigravity agent to scaffold correctly, and perfectly adequate for the visual fidelity this demo needs; reserve WebGL only as a stretch goal if time remains after P0 and P1 are solid.

### 4.2 Mapping Simulation State to Visual Parameters

| Simulation signal | Visual parameter | Mapping |
|---|---|---|
| Current monthly rate (kg CO₂) | Branch color temperature | Low rate → cool green/blue hue; high rate → warm amber/red hue, interpolated on a continuous scale |
| Cumulative trajectory slope | Branch density / count | Steeper upward slope → fewer, sparser branches; flatter or declining slope → denser, more branching growth |
| Rate of change (acceleration) | Pulse/breathing animation speed | Rapidly worsening → faster, more agitated pulse; improving → slow, calm breathing rhythm |
| Active fork in progress | Branch split animation | A new branch path animates outward from the current fork-point node over ~800ms, in the alternate color |

### 4.3 Recursive Branch Generation (Reference Algorithm)

```typescript
function generateBranches(node: {x:number,y:number,angle:number,len:number},
                           depth: number, density: number, hue: number): string[] {
  if (depth === 0 || node.len < 4) return [];
  const endX = node.x + Math.cos(node.angle) * node.len;
  const endY = node.y + Math.sin(node.angle) * node.len;
  const path = `<path d="M${node.x},${node.y} L${endX},${endY}" `
             + `stroke="hsl(${hue},70%,45%)" stroke-width="${depth}" />`;
  const children = Math.round(2 + density * 2); // density ∈ [0,1] from sim state
  let paths = [path];
  for (let i = 0; i < children; i++) {
    const spread = (Math.random() - 0.5) * 1.1;
    paths = paths.concat(generateBranches(
      { x: endX, y: endY, angle: node.angle + spread, len: node.len * 0.72 },
      depth - 1, density, hue));
  }
  return paths;
}
```

### 4.4 Performance Constraint

Cap total rendered branch nodes (e.g., at depth 7–9 with the children formula above) to keep SVG node count in the low hundreds; this keeps re-renders smooth during live forking without needing virtualization or canvas fallback.

---

## 5. Multimodal Ingestion Pipeline (P1)

### 5.1 Unified Extraction Contract

Both the photo and voice paths call a multimodal-capable LLM with an identical output contract, so the rest of the system never needs to know which input mode produced an event.

```
SYSTEM PROMPT (shared by photo + voice extraction):
"You convert receipts or spoken activity descriptions into structured
 activity events. Output ONLY valid JSON matching this schema:
 { category, subtype, quantity, unit, confidence }.
 If uncertain, lower the confidence score rather than guessing wildly.
 Do not include any text outside the JSON object."
```

### 5.2 Photo Path

1. User captures or uploads a receipt image.
2. Image is sent (as base64) to the multimodal LLM endpoint with the shared extraction prompt.
3. Returned line items are mapped through a small category lookup (e.g., "ground beef" → food/red_meat) and converted to ActivityEvent records.

### 5.3 Voice Path

1. User speaks a note; speech-to-text is captured (Antigravity's built-in Gemini Audio live transcription is the fastest path to prototype this without standing up a separate speech API).
2. Transcript text is sent through the same extraction prompt used for photos, requesting the same JSON schema.
3. Output is normalized into ActivityEvent records identically to the photo path.

> **Fallback plan:** If either multimodal path is flaky on demo day, the manual quick-log (P0) path produces the exact same ActivityEvent schema, so the simulation and renderer never need to know or care which path was used. Rehearse a version of the demo that uses manual taps only, as insurance.

---

## 6. Technology Stack

### 6.1 Recommended Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React + TypeScript (Vite) | Fast dev server, strong Antigravity agent familiarity, large training-data coverage for fewer agent errors |
| State management | Zustand or plain React context | Lightweight; avoids Redux boilerplate that eats build time |
| Visualization | Hand-built generative SVG (Section 4) + Framer Motion for transitions | SVG keeps the organism inspectable/debuggable; Framer Motion handles the fork-split animation cleanly |
| Styling / UI chrome | Tailwind CSS + shadcn/ui component primitives | Ships accessible, professional-looking forms/buttons/modals instantly so agent time goes to the organism, not button styling |
| Multimodal extraction | Gemini multimodal API call (image + text in, structured JSON out) | Single model handles both photo and transcript extraction with one shared prompt contract |
| Voice capture | Antigravity-native Gemini Audio live transcription, or Web Speech API as fallback | Already integrated into the Antigravity agent harness; minimal setup |
| Hosting | Vercel or Netlify (static + serverless functions) | Zero-config deploy from a git push; serverless functions handle the thin multimodal-extraction calls |
| Persistence | Browser localStorage/IndexedDB for hackathon scope | No backend needed for a single-user demo; trivially upgradable to a real DB later |

### 6.2 Explicitly Avoided

- No dedicated backend server/database for the hackathon build — adds infrastructure risk with no demo-visible payoff.
- No native mobile build — a responsive web app is faster to ship and equally demoable on a judge's phone via the deployed URL.
- No custom 3D engine (Three.js/WebGL) unless P0 and P1 are both done early — SVG achieves the same visual impact at a fraction of the build risk.

---

## 7. Antigravity-Specific Build & Orchestration Plan

Antigravity's value over a conventional IDE is its agent-first model: a Manager Surface for spawning and observing multiple agents working asynchronously across workspaces, true parallel sub-agents that can build different layers of the stack concurrently, an Editor View for hands-on intervention, and built-in live voice transcription useful directly for the P1 voice-ingestion path. The plan below is written to exploit those specific capabilities rather than treating Antigravity as a generic AI autocomplete tool.

### 7.1 Recommended Agent Decomposition

| Agent | Scope | Surface |
|---|---|---|
| Agent A — Simulation Engine | Implements Section 3 in full isolation as a pure TS module with unit tests; no UI dependencies | Editor View (hands-on, since this is the most logic-critical piece) |
| Agent B — Twin Renderer | Builds the generative SVG component and animation layer per Section 4, consuming a mocked trajectory object before Agent A's module is wired in | Manager Surface (async, parallel to Agent A) |
| Agent C — Capture & Ingestion UI | Builds the tap/photo/voice capture surface and the normalization layer per Section 2.1 and Section 5 | Manager Surface (async, parallel to A and B) |
| Agent D — Integration & Deploy | Wires A+B+C together, sets up Vercel/Netlify deploy, writes the demo rehearsal script | Editor View (final integration pass, hands-on) |

### 7.2 Why This Decomposition Works Well in Antigravity

- Agents B and C have no real dependency on Agent A's actual implementation — they only need the TypeScript interfaces from Section 2, so they can be dispatched to the Manager Surface in parallel immediately after Phase 0, genuinely cutting wall-clock build time rather than just chat turns.
- Agent A is the highest-risk, most novel logic in the project, so it stays in the synchronous Editor View where you can review reasoning and intervene line-by-line rather than discovering a subtle bug only after async agents have already built on top of it.
- Antigravity agents communicate progress via Artifacts (screenshots, walkthroughs); request a screenshot artifact after every Agent B render change so you can visually approve the organism's look without re-running the app yourself each time.

### 7.3 Suggested Antigravity Prompts (copy-paste starting points)

#### Prompt for Agent A (Simulation Engine)

```
Build a standalone TypeScript module `simulation.ts` with zero UI or DOM
dependencies. It must implement: a HabitState interface, a monthlyRateKg()
function combining commute/diet/energy/consumption sub-factors, a
projectTrajectory() function producing a 60-month trajectory, and a
forkTrajectory() function that clones state, applies a delta, and produces
a second trajectory sharing history up to the fork point. Seed the emission
factor constants from publicly known EPA/DEFRA-style average figures and
comment each constant's source assumption. Write unit tests covering: a
baseline projection, a fork that improves the trajectory, and a fork that
worsens it. Do not add any rendering or React code in this module.
```

#### Prompt for Agent B (Twin Renderer)

```
Build a React component `CarbonTwin.tsx` that procedurally renders a
branching organism as SVG, generated by a recursive branch algorithm (not
a static illustration). It must accept a `trajectory` prop matching the
Trajectory interface (ask me for it if not provided) and derive: branch
color hue from current monthly rate (cool green = low, warm red = high),
branch density from trajectory slope, and a breathing/pulse animation
speed from rate of change. Support rendering two trajectories
simultaneously (baseline + hypothetical) as visually distinct overlapping
branch sets that share a trunk up to the fork point and diverge after it,
animating the divergence over ~800ms when a new hypothetical is passed in.
Use Framer Motion for the divergence animation. Keep total SVG path count
under ~300 for performance. For now, develop against a mocked trajectory
generator so this component does not block on the simulation engine.
```

#### Prompt for Agent C (Capture & Ingestion)

```
Build the capture surface: a quick-log panel (manual tap entry across
transport/food/energy/consumption categories using shadcn/ui form
primitives), a photo upload control, and a voice-record control. All
three paths must normalize their output into a single ActivityEvent
object (ask me for the schema if not provided) before handing off to the
app's central event store. For the photo and voice paths, stub the
extraction call behind an `extractActivityFromMedia()` function I will
wire up to a real multimodal API call later — focus on the capture UI,
loading states, and normalization logic first.
```

### 7.4 Suggested Build Sequence Using the Manager Surface

1. **Phase 0** (solo, Editor View): write and commit the shared TypeScript interfaces (ActivityEvent, HabitState, Trajectory) so every agent dispatched afterward shares one contract.
2. Dispatch Agent A, B, and C to the Manager Surface simultaneously; they work in parallel against the shared interfaces.
3. While agents run, prepare the exact demo script (Section 5.2 of the PRD) and the literal receipt photo / spoken phrase you'll use live, so they can be tested against the real pipeline the moment Agent C's stub is replaced.
4. Bring all three branches into the Editor View for Agent D's integration pass; resolve interface mismatches here rather than mid-build.
5. Deploy early and often — get a live URL working with placeholder data before multimodal ingestion is finished, so there is always a demoable fallback state.

---

## 8. UI Sourcing Strategy: Where the Polished Chrome Should Come From

The organism (Section 4) is the one piece of UI that must be custom-built, since it is the product's entire differentiation. Everything else — forms, modals, buttons, layout shell, navigation — should not be hand-rolled or left to ad-hoc agent styling, because that is exactly where hackathon demos visibly run out of time and start looking unpolished. Three options, in order of recommendation:

### 8.1 Recommended: shadcn/ui + Tailwind, scaffolded by Antigravity directly

shadcn/ui is not a traditional component library you npm-install; it's a set of accessible, unstyled-by-default React component source files you copy into your own project, built on Radix UI primitives and styled with Tailwind. This is the best fit for an agentic build because Antigravity's agent can generate the component source directly into your repo — it ends up looking professionally designed by default, and the agent can freely restyle it since you own the source, with no black-box library constraints.

> **How to ask for it:** Tell the Antigravity agent directly: "Scaffold the app shell, navigation, and all form/modal/button UI using shadcn/ui conventions with Tailwind CSS — use Radix primitives for accessibility, and keep a consistent forest-green/warm-coral theme matching the Carbon Twin's color language." This single instruction gets you a coherent, professional design system without sourcing a separate template.

### 8.2 Alternative: a focused open-source dashboard starter as a structural reference

If you want a visual reference point rather than building the shell from a text prompt alone, a well-regarded open-source admin/dashboard starter (for example, a Tailwind-based dashboard template repository on GitHub with a permissive license) can be cloned and stripped down, keeping only the layout shell, sidebar, and card components, then gutting everything else. This is slightly faster for layout structure but riskier for license cleanliness and bloat — only worth it if the agent-prompted shadcn/ui approach is, for some reason, producing a layout you don't like fast enough.

### 8.3 Not Recommended: a generic UI kit or from-scratch CSS design system

Generic UI kits read as visually dated/templated to judges who have seen them in dozens of other submissions, undermining the "this looks like nobody else's project" effect you want from the organism. A fully from-scratch CSS system, meanwhile, is the single biggest time sink relative to payoff in a 1–2 day build — it is exactly the kind of work that should be delegated to a proven, accessible component foundation (shadcn/ui) so your actual hours go into the simulation engine and the organism renderer, which is where the win condition lives.

---

## 9. Deployment & Demo-Day Readiness

### 9.1 Deployment Path

1. Push the repository to GitHub from within Antigravity (it has direct GitHub integration for PR/commit management).
2. Connect the repo to Vercel or Netlify for automatic deploy-on-push; both platforms support the serverless functions needed for the P1 multimodal extraction calls with no extra configuration.
3. Set the multimodal API key as an environment variable in the hosting platform's dashboard, never committed to the repo.
4. Test the deployed URL on a phone on cellular data (not just venue WiFi) before the pitch, since hackathon venue networks are a common point of live-demo failure.

### 9.2 Demo-Day Fallback Checklist

- Manual quick-log path tested and working with zero network dependency — this is the non-negotiable safety net.
- The exact receipt image and the exact spoken phrase used in the live demo pre-tested at least twice against the real extraction pipeline, not just "any receipt."
- A pre-recorded 30-second screen capture of the full demo flow, kept on a local device, in case live WiFi fails entirely during the pitch slot.
- The deployed URL written on a slide/QR code so judges can interact with it themselves afterward — hands-on judge interaction post-pitch is often what tips close scoring decisions.