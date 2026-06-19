# PULSE
### *A Living Carbon Twin*
**Product Requirements Document**

Prepared for: PromptWars Hackathon
Build environment: Google Antigravity (Agent-First IDE)
Version 1.0 | June 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Differentiation](#3-product-vision--differentiation)
4. [Goals & Success Metrics](#4-goals--success-metrics)
5. [User Stories & Use Cases](#5-user-stories--use-cases)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Risks & Mitigations](#8-risks--mitigations)
9. [Build Timeline (1–2 Day Sprint)](#9-build-timeline-12-day-sprint)

---

## 1. Executive Summary

Pulse is a personal sustainability application that replaces the static carbon-tracking dashboard with a living visual organism — the Carbon Twin — whose growth, color, and vitality are driven by a real-time causal simulation of the user's habits rather than a running tally of emissions. Where conventional tools report a number that climbs steadily upward, Pulse renders a branching, breathing structure that visibly diverges into two futures the instant a user considers a change, making the abstract concept of "future emissions saved" immediately legible and emotionally resonant.

The product is built around three pillars that, combined, have not been deployed together in a consumer carbon tool: (1) a lightweight causal simulation engine that forecasts five-year trajectories and forks them live when a hypothetical decision is introduced, (2) a generative, physiologically-animated visual organism rendered in real time from that simulation state, and (3) a unified multimodal ingestion pipeline that normalizes receipt photos, voice notes, and manual taps into a single activity-event schema feeding the same live simulation.

> **Why this matters for judging:** Carbon-footprint trackers with manual logging, generic reduction tips, and gamified streaks are the single most common sustainability submission across hackathons. Pulse is deliberately positioned away from that pattern: the differentiator is not the carbon math (which is well-understood), but the computational model used to visualize causality and the rendering technique used to make that model feel alive on stage.

---

## 2. Problem Statement

### 2.1 The Core Problem

Individuals who want to reduce their environmental impact are rarely short on motivation; they are short on a believable, immediate sense of consequence. Existing carbon calculators present a single cumulative number (e.g., "4.2 tons of CO₂ this year") that is abstract, slow-moving, and disconnected from any specific decision the person just made. Because the feedback loop between action and visible outcome is weak, the habit of tracking rarely survives past the first week of use.

### 2.2 Why Existing Solutions Fall Short

- **Static accounting, not causal reasoning:** most tools multiply an activity (e.g., a flight) by an emissions factor and add it to a total. They do not model what would have happened under an alternative choice, so users cannot see the counterfactual that actually drives behavior change.
- **Visualization that doesn't match the stakes:** bar charts and gauges are the same visual language used for budgeting apps and step counters. They do not create the felt sense of "something is alive and I am responsible for it," which is the emotional mechanism that sustains long-term engagement (the same mechanism that makes Tamagotchi-style apps and habit-tracking "streaks" effective).
- **Friction at the point of logging:** typing in "drove 12 miles" daily is tedious enough that most users abandon manual logging within days; few tools fuse photo, voice, and manual input into one frictionless capture surface.

### 2.3 Target Users

| Segment | Description | Primary Need |
|---|---|---|
| Climate-conscious professionals | 25–45, urban, already recycle/compost, want to go further but don't know which actions matter most | Prioritization — which one change moves the needle |
| Habit-driven optimizers | Quantified-self users who already track steps, sleep, spend | A new metric that's as satisfying to watch move as their other trackers |
| Climate-anxious newcomers | Want to act but feel paralyzed by scale of the problem | A small, immediate, visible win that counters helplessness |

---

## 3. Product Vision & Differentiation

### 3.1 Vision Statement

*"Make the future consequence of today's decision visible, in real time, as something that looks and behaves like it's alive."*

### 3.2 The Three Pillars of Differentiation

#### Pillar 1 — Causal Forking Simulation (not lookup-table accounting)

Rather than summing static emissions factors, Pulse runs a small state-space model of the user's habit vector (commute mode, diet pattern, energy source, consumption frequency) forward across a five-year horizon. When the user proposes a hypothetical change, the engine clones the current state and forks the simulation into two parallel trajectories computed from the same point in time — the status quo path and the changed path — and these two paths are rendered diverging on screen, live, client-side, with no server round-trip required for the demo's core wow-moment.

#### Pillar 2 — The Carbon Twin (generative organism, not a chart)

The simulation state drives a continuously animated, generative SVG/WebGL structure resembling coral or mycelial growth. Branch density, color temperature (cool blue-green for low emissions, warm amber-red for high), and a subtle "breathing" pulse (tied to a decay/recovery rate) are all functions of the live simulation output. Nothing about the organism is pre-rendered or templated per-user; it is procedurally generated from numeric state, so every user's Twin is structurally unique.

#### Pillar 3 — Unified Multimodal Capture

Photo-of-receipt, spoken voice note, and manual quick-tap all funnel through one ingestion pipeline that extracts a normalized activity event (category, quantity, confidence score) before it reaches the simulation engine. This lets a single demo flow show three different real-world capture moments feeding the identical live organism within roughly thirty seconds — a strong, fast, visually legible proof point for judges.

### 3.3 Competitive Landscape Snapshot

| Existing approach | What it does well | What Pulse does differently |
|---|---|---|
| Static footprint calculators (e.g., factor-based web calculators) | Accurate baseline estimate | Pulse adds forward causal simulation and forking, not just a snapshot |
| Gamified eco-apps (streaks, badges, leaderboards) | Strong habit reinforcement loop | Pulse's reinforcement is visual/emotional (a living twin) rather than points-based |
| Corporate ESG dashboards | Rigorous, auditable accounting | Pulse is intentionally lightweight and personal, optimized for felt understanding over audit-grade precision |

---

## 4. Goals & Success Metrics

### 4.1 Hackathon-Scope Goals (1–2 day build)

1. Ship a working, live demo where at least two of the three input modes (manual tap is mandatory; photo or voice is the stretch second mode) feed a visible, animated Carbon Twin.
2. Implement the causal forking simulation as real, working logic (not a canned animation) — judges should be able to propose an arbitrary hypothetical and see the fork compute and render live.
3. Achieve a render that is visually distinctive enough to be remembered without narration — the organism should communicate "good" vs "bad" trajectory at a glance, in under two seconds of viewing.
4. Deploy to a publicly reachable URL so judges can interact with it on their own device during/after the pitch.

### 4.2 Post-Hackathon Product Metrics (if continued)

| Metric | Target | Why it matters |
|---|---|---|
| D7 retention | > 25% | Indicates the Twin creates a return-worthy emotional hook beyond novelty |
| Median time-to-first-log | < 60 seconds | Validates that multimodal capture actually removes onboarding friction |
| % of users who run ≥ 1 hypothetical fork per week | > 40% | Validates that the causal-forking feature is being used as a decision tool, not just viewed once |
| Self-reported behavior change at 30 days | > 20% take ≥ 1 suggested action | The ultimate outcome metric — actual emissions-relevant behavior change |

---

## 5. User Stories & Use Cases

### 5.1 Core User Stories

- As a new user, I want to see my Carbon Twin appear within my first minute of use so that I immediately understand the product's core metaphor without reading instructions.
- As a user logging a daily activity, I want to snap a photo of a receipt, speak a quick note, or tap a quick-log button — whichever is fastest in the moment — so that logging never feels like a chore.
- As a user considering a lifestyle change, I want to propose a hypothetical (e.g., "what if I cycled to work twice a week") and see two diverging future versions of my Twin so that I can decide whether the change is worth the effort.
- As a returning user, I want my Twin's current state to persist and reflect my accumulated real choices, distinct from any hypothetical I'm exploring, so that exploration never accidentally overwrites my actual progress.
- As a judge or first-time visitor, I want to try the live demo on the spot and see an immediate, legible visual response to my input so that the product's value is obvious without an explanation.

### 5.2 Primary Demo Flow (Hackathon Pitch Sequence)

1. Open Pulse on a shared screen; Carbon Twin is shown in a neutral, established baseline state.
2. Presenter speaks a voice note: "I just drove forty-five minutes to the airport and flew to Chicago." Twin visibly dims and contracts within seconds as the activity is parsed and ingested.
3. Presenter snaps a photo of a grocery receipt; itemized food purchases are extracted and classified; Twin adjusts again, live.
4. Presenter taps "What if?" and selects "Switch 2 commute days/week to cycling." The simulation forks: the Twin splits into two visibly diverging branches over an animated five-year timeline — one dimmer, one brighter — quantified with a CO₂ delta and a plain-language insight.
5. Presenter commits to the hypothetical; it becomes the new baseline, and the losing branch fades out, demonstrating that this is a decision tool, not just a toy.

---

## 6. Functional Requirements

### 6.1 Must-Have (P0) — required for hackathon demo

| ID | Requirement | Notes |
|---|---|---|
| P0-1 | Manual quick-log: tap-based activity entry across transport, food, energy, consumption categories | Must work fully offline-tolerant; this is the demo's reliability fallback |
| P0-2 | Causal simulation engine: maintain a current habit-state vector and project a 5-year emissions trajectory from it | Runs entirely client-side for demo reliability and zero-latency forking |
| P0-3 | Forking: given a hypothetical change, clone state and compute a second trajectory from the fork point | Must complete in well under 1 second to preserve the live-demo wow-moment |
| P0-4 | Carbon Twin renderer: procedurally generated, animated visual organism whose parameters are pure functions of simulation state | SVG or WebGL; must visibly differ between a healthy and an unhealthy state within 2 seconds of a state change |
| P0-5 | Persistent baseline state vs. ephemeral hypothetical state, clearly separated in the data model | Prevents accidental overwrites; required for the "commit to hypothetical" flow |
| P0-6 | Deployed, publicly reachable build | Static hosting acceptable given client-side architecture |

### 6.2 Should-Have (P1) — strong differentiators if time allows

| ID | Requirement | Notes |
|---|---|---|
| P1-1 | Photo/receipt ingestion: image upload → extracted line items → classified into activity categories | Use a multimodal LLM call for extraction + classification in one pass |
| P1-2 | Voice note ingestion: speech → transcription → same activity-event schema as photo and manual paths | Antigravity's built-in live voice transcription can prototype this quickly |
| P1-3 | Plain-language insight generator: one-sentence explanation of why a fork diverged the way it did | Small LLM call; keep prompt tightly scoped to avoid latency |

### 6.3 Could-Have (P2) — explicitly out of scope for 1–2 day build

- Bank/financial account integration for automatic transaction-based carbon inference.
- Social graph, leaderboards, or multiplayer comparison features.
- Audit-grade emissions accounting suitable for corporate ESG reporting.
- Native mobile apps (iOS/Android) — ship as a responsive web app instead.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Fork computation and Twin re-render must complete in under 1 second on a mid-range laptop to preserve live-demo impact. |
| Reliability | Manual quick-log path must work with zero external API dependency so the demo never stalls on a flaky network. |
| Privacy | Receipt photos and voice notes are processed and then discarded; only the derived activity event (category + quantity) is persisted, not raw media, by default. |
| Accessibility | Color-driven states (warm/cool) must be paired with a redundant non-color signal (shape density, an icon, or a numeric label) for colorblind users. |
| Scalability | Architecture should not preclude a future multi-user backend, even though the hackathon build is local-first/client-heavy. |

---

## 8. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Multimodal extraction (photo/voice) is unreliable mid-demo | Medium | Manual tap is the P0 fallback; pre-test the exact receipt and phrase used in the live pitch beforehand |
| Simulation feels arbitrary / not scientifically grounded | Medium | Ground default emissions factors in published figures (e.g., EPA/DEFRA-style per-activity averages) even though the forward model is simplified |
| Organism rendering looks gimmicky rather than informative | Medium | Always pair the visual with a numeric CO₂ delta and one-sentence insight so the visual augments rather than replaces clarity |
| Scope creep across three pillars in a 1–2 day window | High | Build P0 fully first; treat photo and voice ingestion as additive stretch goals with the same output schema, not core dependencies |

---

## 9. Build Timeline (1–2 Day Sprint)

Detailed hour-by-hour task breakdown, agent allocation, and Antigravity-specific orchestration plan are provided in the accompanying Technical Design Document, Section 7.

### 9.1 High-Level Phasing

| Phase | Duration | Output |
|---|---|---|
| Phase 0 — Spec & scaffolding | 1–2 hrs | Repo structure, design tokens, simulation schema agreed and committed |
| Phase 1 — Core engine + manual log + Twin renderer (P0) | 6–8 hrs | Working end-to-end demo loop: log → simulate → render → fork |
| Phase 2 — Multimodal ingestion (P1) | 3–4 hrs | Photo and/or voice path feeding the same schema |
| Phase 3 — Polish, deploy, rehearse pitch | 3–4 hrs | Deployed URL, rehearsed demo script, fallback plan if live APIs fail |