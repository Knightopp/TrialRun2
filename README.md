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

The website's canonical database is the Supabase project with ref `sdkadflrxjdhxduwvrsz` (`https://sdkadflrxjdhxduwvrsz.supabase.co`). Its client pins that URL so a stale Vercel `VITE_SUPABASE_URL` cannot silently split website traffic. Configure the Flutter app with this same project URL and the project's publishable key. The browser uses a publishable key and relies on database row-level security; never put a secret or service-role key in either app.

Server-side integrations must set `SUPABASE_URL` to this same project and keep any secret key in server-only environment settings. The website's client does not read URL overrides from Vite or Vercel.

The administrator dashboard requires Supabase Auth email/password sign-in and an active `admin` profile in `volunteers`. Anonymous users can view the public event catalogue only; attendee, staff, registration, check-in, and audit-log data is protected by row-level security. The shared-project security migration is in `supabase/migrations/20261005000000_admin_only_rls_remediation.sql`.

Legacy setup scripts with unsafe anonymous policies or a plaintext admin password, plus ad-hoc database scripts that issue writes against the configured project, have been removed. Apply reviewed migrations through the project's migration workflow. Keep `SUPABASE_SERVICE_ROLE_KEY` only in server-side deployment settings; the audit endpoint requires it for persistent writes.

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
