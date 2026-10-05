# Srishti Fest Website 🚀

Welcome to the official repository for the **Srishti Fest** website! This is a highly interactive, beautifully animated single-page web application designed to showcase events, engage visitors, and provide a seamless registration experience. 

Built with React, Vite, and GSAP, this project leverages cutting-edge UI components to create a premium, immersive digital experience.

---

## ✨ Features & Components

This website incorporates several modern, interactive React components (courtesy of [React Bits](https://reactbits.dev/) and custom GSAP wizardry):

- **Immersive Loading Screen:** A custom boot-up sequence featuring `SplitText` for the title and a `LatticeLoader` matrix before revealing the main site.
- **Dynamic Backgrounds:** A `CursorGrid` that subtly reacts to mouse movements and clicks across the entire viewport.
- **Flowing Event Menus:** A slick `FlowingMenu` that displays high-quality event photography and details upon hovering over event names.
- **Interactive Bonus Mini-Game:** An uncatchable `DodgeField` button trapped inside an animated `BorderGlow` neon arena.
- **Masonry Event Gallery:** A beautiful `Masonry` staggered grid showcasing moments from past Srishti fests, with stagger animations triggered on scroll.
- **Page Transitions:** A `PixelSwap` transition effect that smoothly transitions the user between the main page and the registration form.
- **Floating Dock Navigation:** A macOS-style magnifying `Dock` at the bottom of the screen for quick navigation.
- **Staggered Modal Side-Panels:** Detailed views for specific events using `StaggeredMenu`.

---

## 📅 Srishti Events Detailed

The website showcases a variety of technical and cultural events. Here is a breakdown of the featured events:

1. **TRACE BOT (Robotics)**  
   *Build an autonomous line-following robot to race the tracks.* A test of hardware engineering and precise sensor calibration.
   
2. **TREASURE HUNT (Fun)**  
   *Solve cryptic clues to find the hidden technical treasures.* An engaging puzzle hunt taking participants across the campus.

3. **CODING & DEBUGGING (Dev)**  
   *Test your algorithmic logic and debugging skills against time.* A high-stakes competitive programming challenge.

4. **AI WEBSITE MAKING (Dev)**  
   *Use AI tools to rapidly prototype and design stunning websites.* A modern hackathon focused on leveraging LLMs for rapid development.

5. **BLIND CODING (Dev)**  
   *Code with your monitor off! Test your syntax muscle memory.* A chaotic but incredibly fun challenge for hardcore developers.

6. **IDEATHON (Innovation)**  
   *Pitch your groundbreaking tech startup ideas to the jury.* Bring your business plans and technical architectures to the spotlight.

7. **WALTZ (Culture)**  
   *A spectacular dance competition combining grace and rhythm.* The premier cultural event of the fest.

8. **MINDGAME (Puzzle)**  
   *A series of logic puzzles and lateral thinking challenges.* Tests raw analytical skills and out-of-the-box thinking.

9. **IT QUIZ (Knowledge)**  
   *Test your knowledge of the latest in tech, IT history, and trivia.* A rapid-fire quizzing event for tech enthusiasts.

---

## 🛠️ Tech Stack

- **Framework:** React + Vite
- **Styling:** Vanilla CSS (with heavy use of CSS variables and advanced mask-images)
- **Animation:** GSAP (`@gsap/react`, `ScrollTrigger`, `SplitText`), Framer Motion
- **Icons:** React Icons (`fi`)

## Shared Supabase project

The website's canonical database is the Supabase project with ref `sdkadflrxjdhxduwvrsz` (`https://sdkadflrxjdhxduwvrsz.supabase.co`). The Flutter app and website share data only when both clients use this same project URL. The browser uses a publishable key and relies on database row-level security; never put a secret or service-role key in either app.

Configure the website's Vite environment with:

```env
VITE_SUPABASE_URL=https://sdkadflrxjdhxduwvrsz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<the project's publishable key>
```

`VITE_SUPABASE_ANON_KEY` remains accepted for existing deployments. Server-side integrations must set `SUPABASE_URL` to the same project and keep any secret key in server-only environment settings. The client rejects a URL for another project to prevent the browser silently connecting to a different database.

The legacy SQL files `supabase_setup.sql` and `setup_web_admin.sql` still name an older project. Do not run them against the shared project; use a reviewed migration specific to the shared project's current schema.

## 🚀 Getting Started

To run this project locally:

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd "website trial"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---
*Built for Srishti Fest.*
