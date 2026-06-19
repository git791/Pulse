# 🌱 Pulse — A Living Carbon Twin

Welcome to **Pulse**! Pulse is a personal sustainability application that replaces static charts and tables with a living, breathing visual organism — your **Carbon Twin**. The Twin's growth, color, and vitality are driven by a real-time causal simulation of your lifestyle habits and daily decisions.

Instead of just tracking a number that goes up, Pulse shows you the immediate consequence of your actions and visualizes how a proposed lifestyle change forks your environmental footprint over a five-year future.

---

## 🌟 The Core Concept & Purpose

Most carbon trackers are slow-moving bookkeeping tools. Pulse was designed to create an **immediate, emotional connection** to carbon impact:
- **Causal Reasoning:** Pulse models your habits over a 5-year timeline. When you suggest a change (a "What-if?"), it forks your trajectory into two paths: your status quo and your new path.
- **The Carbon Twin:** Your habits procedurally generate a 3D branching organism. It shifts from a healthy **Sky Blue & Emerald Green** (low emissions) to an elevated **Amber & Orange** or critical **Red** (high emissions) and breathes based on your data.
- **Unified Multimodal Ingestion:** Easily log activities via manual taps, receipt photo upload, or voice notes.

---

## 🎨 UI & Layout Tour

When you open the Pulse interface for the first time, you'll see a clean, glassmorphic layout divided into three main zones:

### 1. The Center Stage: The Carbon Twin
The large interactive 3D model in the center is your procedural twin.
- **Vibrant Blue/Green:** Means your current emissions projection is highly sustainable.
- **Warm Orange/Red:** Indicates elevated or critical footprint projections.
- **The Pulse:** The rate and shape of the twin's movement simulate the vitality and pressure on your carbon cycle.

### 2. The Right Panel: Ingestion & Logging
This is where you log your daily activities:
- **Quick Log:** Fast manual selector grouped into 4 categories:
  - 🚗 **Transport:** Log car rides, flights, train commutes, cycling, etc.
  - 🍽️ **Food:** Log consumption of beef, poultry, dairy, vegetables, etc.
  - ⚡ **Energy:** Log electricity usage, heating oil, or natural gas.
  - 🛍️ **Goods:** Log purchase of consumer goods like clothing, electronics, or furniture.
- **Photo Ingestion:** Snap or upload a photo of a receipt or item to let AI automatically parse and log the event.
- **Voice Ingestion:** Speak a natural voice note (e.g. *"I just rode the train for 20 kilometers"*) to log it instantly.

### 3. The Left Panel: Insights & Causal Simulation
- **Live Insights:** Dynamic alerts suggesting high-impact ways to optimize your footprint.
- **What-If Sandbox (Causal Forking):** A sandbox panel where you can toggle hypothetical changes (e.g., *"Switch 2 commute days/week to cycling"*) and instantly see the Twin and the trajectory graph fork.
- **Trajectory Chart:** A line graph forecasting your cumulative 5-year footprint, comparing your **Baseline** (actual) trajectory with your **Hypothetical** (proposed) trajectory.

---

## 🚀 How to Get Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation
1. Clone or download the project workspace directory.
2. In your terminal, navigate to the project directory:
   ```bash
   npm install
   ```

### Running Locally
To launch the hot-reloading development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the application!

### Building for Production
To build the app and run the Express production server:
```bash
npm run start
```
This builds the client application and hosts the server at [http://localhost:5000](http://localhost:5000).

---

## 💡 How to Use (Step-by-Step Walkthrough)

Follow this path to get the complete Pulse experience:

1. **Observe the Baseline:** Open the app. The Carbon Twin will start in a balanced, healthy green-blue baseline state.
2. **Log your first activity:**
   - Go to the **Quick Log** tab on the right.
   - Select 🚗 **Transport**, click **Car Drive**, adjust the slider to 50 km, and click **Log Activity**.
   - Watch the Carbon Twin react immediately—it will adjust its shape and color slightly to reflect the new emission event.
3. **Explore a "What-If" scenario:**
   - Locate the **What-If Sandbox** in the bottom-left corner.
   - Click the plus (+) icon to create a new hypothetical modifier (e.g. *"Install residential solar panels"* or *"Eat vegetarian 3 days/week"*).
   - Once activated, look at the **Trajectory Chart** and the **Carbon Twin**—the twin will split into two visual branches: one representing your status quo, and the other showing your potential green future!
4. **Commit to the change:**
   - If you decide this change is something you want to adopt, click **Commit Change**.
   - Your hypothetical line will become your new baseline, and the Twin will fuse back together, establishing a healthier state.
5. **Reset and experiment:**
   - You can click the **Reset Icon** (Rotate arrow) in the top-right header at any time to clear your logged events and start from scratch.
