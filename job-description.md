# 💻 Electron Developer for Blog Automation App

**Project: eg-desk (Desktop Blog Automation Tool with Claude Code CLI)**

## 🧹 Project Snapshot

* **Client**: T Trans (Global Electrical Sensor Manufacturer)
* **App Type**: Electron-based, mainly local environment execution
* **Goal**: Automate bilingual blog content creation, publishing, and SEO
* **AI Integration**: Claude Code CLI (or suggest alternatives)

---

## 🏢 Business Background

T Trans is launching its first WordPress blog to expand into the global market. However, their small marketing team struggles with manual content creation, SEO, and bilingual (Korean-English) publishing. We’re building a fully local desktop automation tool to streamline this process.

---

## 📦 Deliverables

### 📅 Timeline

* **Phase 1 Duration (Updated)**: 2 weeks total

  * **Demo Day**: August 4th (Monday)
  * 🎯 **First Milestone Goal**: Deliver a working pipeline that allows a user to write a blog post (via Claude CLI or input interface) and upload it to WordPress via the REST API. Minimal UI and pipeline.
  * 🧑‍💻 **Collaboration Note**: I  will be actively contributing to the project alongside the selected developer and am going to be working on my git repo  for the demo day over this weekend.

### Phase 1 (2 weeks): Blog Automation Core

* Electron-based native desktop UI (cross-platform for macOS and Windows)
* WordPress REST API integration for automated publishing
* Claude CLI-powered terminal for content generation
* Dual-panel layout: WordPress preview (70%) + AI terminal (30%)
* Bilingual content workflows (Korean & English)
* Light grey minimal UI theme, macOS-native titlebar
* Browser automation with Electron `webContents API`

### Phase 2 (Optional - 6 weeks): Full Platform Expansion

* AI chat interface with file upload & conversation memory
* Drag-and-drop content generation from spec sheets
* Claude CLI agents for SEO, content analysis, and deployment
* Local file management with version history
* Multi-tabbed browser system & embedded DevTools

---

## 🚀 Responsibilities

* Build publishing workflow with WordPress REST API
* Implement Claude CLI into a desktop terminal UI
* Create  content creation + SEO tools
* Develop cross-platform native-style UI (macOS & Windows) with resizable panels
* Integrate Electron webContents for in-app browser automation

---

## ✨ Expected Skills

* Electron (desktop app development experience)
* Node.js / JavaScript (modern ES6+)
* REST API integration
* HTML/CSS + frontend JS frameworks
* Git (collaborative workflows)

## 🔺 Bonus Skills

* WordPress REST API expertise
* Experience with Claude CLI or similar tools (OpenAI CLI, etc)
* Bilingual localization (KR/EN)
* UI/UX design for native desktop apps
* SEO content automation tools (e.g., meta tag generation)

---

## 🎨 UX & Architectural Philosophy

### 0. EG-Desk Foundation

EG-Desk is a developer-led, AI-integrated desktop platform designed to enable "human-in-the-loop" workflows, combining browser-based environments with agentic automation. It serves as the **foundational architecture** for this blog automation project.

**EG-Desk emphasizes:**

* Embedded Chromium browsers with agent-observable context
* Modular architecture for task-specific automation
* Full local execution (no backend server)
* Agent-driven natural language workflow management
* Deep Claude Code CLI integration for cost-predictable AI ops

This blog automation project for T Trans is a **branching implementation** of EG-Desk, leveraging its structure while narrowing its scope for production delivery.

### 1. Claude Code CLI & Predictable Cost UX

* Claude Code CLI was selected due to its **monthly pricing** model, providing **predictable cost UX** which clients prefer over usage-based models.
* Any AI Agent tools with comparable performance and **monthly-fixed pricing** are welcome. The client avoids unpredictable costs even if the monthly fee is slightly higher.

### 2. Framework Choice Philosophy (Electron vs others)

* T Trans project is based on a **branch from my EG-Desk project**, which is designed for human-in-the-loop AI-agentic workflows with embedded browser capabilities.
* This project is an **experimental and marketing-wise strategic approach**, built on the same principles  from eg-desk but scoped for blog automation, thus named Eg-desk\:T trans
* While frameworks like Tauri may offer performance benefits, \*\*UX and extensibility for ultimate eg-desk project goal \*\*is prioritized.
* Many platforms (e.g., Make, Integromat, MCP, etc.) require time to learn, especially for small teams. EG-Desk is structured to **allow natural language-driven automation**.
* AI agents in EG-Desk aim to handle not just workflows, but also **internal tool configurations**, reducing manual setup even on complex platforms.

### 3. Browser Tech & Agent Context Awareness

* We prioritize **human-in-the-loop agent workflows**, where the browser (Chromium-based) is **visible within the app** and **user interaction is trackable**.
* Playwright is under consideration due to its Chromium base, but Electron’s `webContents` may offer more **real-time context bridging** inside the app. We can freely choose whatever framework we see most optimal.
* In EG-Desk, AI agents will be able to reference user actions and system states.
* While EG-Desk\:T-trans doesn’t need full agent observation for Phase 1, we'd like to aim for the **system to be modularized** to support those advanced use cases in future expansions. \* Not for demo
* WordPress REST API expertise
* Experience with Claude CLI or similar tools (OpenAI CLI, etc)
* Bilingual localization (KR/EN)
* UI/UX design for native desktop apps
* SEO content automation tools (e.g., meta tag generation)

✅ You are welcome to use any AI IDE or development assistant during this project, such as GitHub Copilot, Cursor, or Claude Workbench.

---

## ⚖️ Tech Stack

* Electron + electron-vite + Node.js
* Claude Code CLI (preferred AI assistant)
* WordPress REST API (/wp-json/wp/v2)
* Electron webContents API (DOM automation)
* electron-store (local config storage)
