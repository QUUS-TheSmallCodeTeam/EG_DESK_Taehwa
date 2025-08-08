# EG-Desk:Taehwa - Product Requirements Document

## Executive Summary

EG-Desk:Taehwa is a specialized AI-powered bilingual content automation system for Taehwa Trans (global electrical sensor manufacturer). Built on modern Electron + electron-vite framework as a desktop application, it operates entirely locally with direct access to user's local files and folders. The system provides intuitive chat-based AI automation with drag-and-drop file support, browser control through webContents API, and WordPress integration tailored for both Korean and English technical content creation and management.

## Project Overview

### Client: Taehwa Trans
**Business**: Global electrical current sensor manufacturer serving both Korean and international markets
**Current Status**: English-only website due to resource constraints, no blog presence yet
**Primary Need**: Bilingual content creation system (Korean + English) for website and blog establishment
**Target Users**: Non-technical marketing staff, content managers, business stakeholders

### Project Goals
- Create bilingual (Korean + English) technical content for global electrical sensor market
- Reduce manual content creation effort by 80% through AI-powered automation
- Implement dual-language SEO optimization for both Korean and international markets
- Provide intuitive chat interface accessible to non-technical users
- Enable seamless WordPress integration with local file system access
- Support drag-and-drop file integration for content creation workflows

## Core Requirements

### 1. Chat Interface System

**Primary Chat Hub**
- Natural language processing for bilingual content operations
- Drag-and-drop file integration directly into chat interface
- Integration with Claude Code CLI for technical assistance
- Conversation history and context retention
- Local file reference and processing within chat context

**AI Agent Communication**
- Direct interface to Claude Code for code operations
- Browser automation agent for web interactions
- SEO optimization agent for content analysis
- Deployment pipeline agent for server operations

### 2. Local File Management System

**User-Friendly File Interface**
- Simple file browser for content management (non-developer focused)
- Direct access to local files and folders on user's computer
- Drag-and-drop file integration into chat interface
- Visual file preview and organization tools

**Version Control (Simplified)**
- Basic version history tracking without technical complexity
- Simple backup and restore functionality
- Content revision management accessible to non-technical users
- No advanced developer tools (git diff, merge conflicts, etc.)

**Local-First Architecture**
- All files stored and processed locally on user's machine
- No cloud dependency for file operations
- Direct integration with existing local website files
- Secure local file access without external uploads

### 3. AI-Agent Workflow Automation

**Bilingual SEO Optimization**
- Dual-language content analysis (Korean + English)
- Market-specific keyword optimization for global reach
- Automated meta tag generation for both languages
- Image alt-text automation in appropriate language
- Cross-cultural content adaptation and localization

**Auto Code-Fix for Updates**
- Category CRUD operations automation
- Database schema updates
- Form generation and validation
- API endpoint creation and testing
- Security patch implementation

**Bilingual Content Creation System**
- Technical content generation for global electrical sensor market
- Dual-language SEO optimization (Korean domestic + English international)
- Local file integration for existing company assets
- Drag-and-drop content workflow for non-technical users
- Cross-platform publishing management

### 4. Browser Control and Configuration (Electron-Powered)

**Security Defaults (for production)**
- webSecurity: true
- contextIsolation: true
- nodeIntegration: false
- sandbox: true (if compatible; otherwise keep other flags strict)
- allowRunningInsecureContent: false
- executeJavaScript: restricted to trusted domains and predefined snippets only

**Automated Navigation with Electron webContents**
- webContents.loadURL() for programmatic page navigation
- webContents.executeJavaScript() for DOM interaction and form automation
- webContents.session for cookie and authentication management
- webContents.capturePage() for screenshot capture and documentation
- webContents.findInPage() for content search and validation

**Multi-Tab Content Management**
- Multiple webContents instances for parallel page operations
- webContentsView for embedded browser sessions within the application
- BrowserWindow management for separate browser instances
- webContents.setWindowOpenHandler() for controlling new window creation
- Real-time content synchronization across multiple WordPress pages

**Advanced Browser Automation**
- DevTools Protocol integration for network request monitoring
- webContents.insertCSS() for visual customization during automation
- webContents.setUserAgent() for mobile/desktop testing simulation
- webContents.navigationHistory for workflow state management
- webContents.print() for document generation and archiving

### 5. Terminal Control System

**Docker PHP Environment**
- Containerized PHP development environment
- Database management and migration tools
- Server configuration and optimization
- Log monitoring and analysis

**Deployment Pipeline**
- Automated staging and production deployment
- Database backup before deployments
- Health check validation post-deployment
- Rollback automation for failed deployments

## Technical Architecture

### System Design (Local-First Architecture) Example

**Modern Electron-Vite Architecture (ES Modules)**
```
EG-Desk:Taehwa (electron-vite + ESM)
├── Main Process (src/main/)
│   ├── index.js (Electron app controller)
│   ├── preload.js (secure IPC bridge)
│   └── modules/
│       ├── ClaudeService.js (Claude API integration)
│       └── WebContentsManager.js (browser control)
├── Renderer Process (src/renderer/)
│   ├── index.html (main UI template)
│   ├── index.js (application entry point)
│   ├── components/
│   │   ├── BrowserTabComponent.js (browser tab UI)
│   │   └── ChatComponent.js (AI chat interface)
│   └── modules/
│       ├── EGDeskCore.js (module orchestrator)
│       ├── WorkspaceManager.js (workspace coordination)
│       ├── core/
│       │   ├── ai-agent/ (Claude integration)
│       │   ├── content-system/ (content generation)
│       │   └── state-management/ (global state)
│       └── blog-automation/wordpress/ (WP integration)
└── Build System
    ├── electron-vite (modern build system)
    ├── Vite 7.0.6 (high-performance bundler)
    └── Strict ES6 modules (.js extensions required)
```

**Core System Modules**
- **GlobalStateManager**: Centralized application state with event-driven updates
- **WorkspaceManager**: Multi-workspace coordination and seamless switching
- **EGDeskCore**: Module orchestrator and system coordinator
- **ClaudeIntegration**: Claude Code CLI integration with conversation management
- **WebContentsManager**: Browser tab control with webContents API
- **UIManager**: Integrated theme, layout, animation, and notification system
- **WPApiClient**: WordPress REST API client with secure authentication

### Technology Stack

**Local Application Stack**
- Electron 37.2.4 (main application framework - single executable)
  - webContents API for browser automation
  - WebContentsView for embedded web content
  - BrowserWindow management for window control
  - Session API for authentication and cookies
- electron-vite 4.0.0 (modern build system with HMR and ESM support)
- Vite 7.0.6 (high-performance bundler)
- Native JavaScript ES6 modules (strict ESM architecture)
- CSS3 with custom properties (no external UI framework dependency)

**Local Automation & Integration**
- Claude Code CLI (primary AI assistant - local execution)
- LangChain (multi-provider integration: Claude/OpenAI/Gemini)
- Axios 1.6.0 (WordPress REST API calls)
- electron-store 8.1.0 (local settings and data storage)
- Electron Browser APIs:
  - webContents.executeJavaScript() for content manipulation
  - webContents.session for authentication management
  - webContents.navigationHistory for workflow tracking
  - DevTools Protocol for advanced debugging and monitoring
- Node.js (local file operations and API calls)

**Local Development Environment**
- Git (local version control integration)
- electron-vite development server (port 5173, HMR support)
- Strict ES6 module system (.js extensions required); `preload.js` uses CommonJS as a secure IPC bridge
- yarn package manager for dependency management
- No external server infrastructure required

## Feature Specifications

### 1. Chat Interface

**Natural Language Commands (Bilingual Support)**
- "Create a blog post about Rogowski coils in both Korean and English"
- "Optimize this content for Korean domestic and English international SEO"  
- "Use these local product images to create technical documentation"
- "Translate this existing content and adapt for global market"
- *Drag-and-drop files*: "Use this product spec sheet to generate blog content"

**Response Capabilities**
- Code snippets with syntax highlighting
- Before/after screenshots of changes
- SEO analysis reports with actionable recommendations
- Step-by-step operation logs with status updates

### 2. Code Editor Integration

**PHP-Specific Features**
- Laravel/PHP framework detection and support
- Database migration assistance
- MVC pattern recognition and automation
- Security vulnerability detection and fixes

**Visual Workflow Management**
- Drag-and-drop task organization (adapted from EG-Desk canvas)
- Progress tracking for multi-step operations
- Visual dependency mapping between tasks
- Real-time collaboration indicators

### 3. Browser Automation Capabilities (Electron webContents)

**Content Management Tasks with webContents API**
- webContents.executeJavaScript() for product page DOM manipulation
- webContents.session.webRequest for image optimization workflows
- Automated form filling using webContents.insertCSS() and executeJavaScript()
- webContents.findInPage() for link validation and broken link detection
- Real-time content preview using embedded WebContentsView

**SEO Operations with Browser Integration**
- executeJavaScript() for meta tag analysis and optimization
- webContents.capturePage() for visual SEO audit screenshots
- DevTools Protocol for Core Web Vitals monitoring
- webContents.navigationHistory for user journey optimization
- Multi-tab performance analysis using multiple webContents instances

### 4. Deployment Pipeline

**Staging Workflow**
- Automatic staging deployment on code changes
- Visual diff comparison before production
- Automated testing suite execution
- Performance impact analysis

**Production Deployment**
- Zero-downtime deployment strategies
- Database migration with rollback capability
- Cache invalidation and CDN updates
- Health monitoring and alerting

## User Experience Design

### Primary Workflow: Content Update Request

1. **User Input**: "Add new product category for outdoor sensors"
2. **AI Analysis**: System analyzes request and identifies required changes
3. **Plan Generation**: Creates step-by-step execution plan
4. **User Approval**: Visual preview of changes with approval workflow
5. **Automated Execution**: Performs code changes, testing, and deployment
6. **Completion Report**: Detailed summary with before/after comparisons

### Interface Layout

**Main Dashboard (Electron-Optimized Layout)**
- Chat interface (left panel, 40% width)
- Code editor/browser view (center panel, 45% width):
  - Embedded WebContentsView for live WordPress preview
  - Multiple webContents tabs for parallel operations
  - webContents DevTools integration panel
- Task status and logs (right panel, 15% width)
- Terminal access (bottom drawer, collapsible)
- Browser automation controls (floating toolbar)

**Keyboard Shortcuts** (Enhanced for Browser Control)
- `Cmd/Ctrl+N`: New workflow
- `Cmd/Ctrl+T`: Toggle terminal
- `Cmd/Ctrl+B`: Toggle browser view
- `Cmd/Ctrl+Tab`: Switch between browser tabs (webContents)
- `Cmd/Ctrl+R`: Reload current webContents
- `Cmd/Ctrl+Shift+I`: Toggle DevTools for current tab
- `Cmd/Ctrl+D`: Deploy to staging
- `Cmd/Ctrl+Shift+D`: Deploy to production
- `Cmd/Ctrl+F`: Find in page (webContents.findInPage)
- `Cmd/Ctrl+Shift+C`: Capture screenshot of current tab

## Success Metrics

### Performance Indicators
- **Workflow Efficiency**: 80% reduction in manual coding time
- **Deployment Frequency**: Enable daily deployments vs. current weekly
- **Error Reduction**: 90% decrease in post-deployment issues
- **SEO Improvement**: 25% increase in organic search traffic

### User Adoption Metrics
- **Daily Active Operations**: Track automation usage frequency
- **Chat Interaction Quality**: Measure successful task completions
- **User Satisfaction**: Regular feedback collection and analysis
- **Training Time**: Reduce onboarding time for new team members

## Risk Assessment and Mitigation

### Technical Risks
- **PHP Compatibility**: Extensive testing across PHP versions
- **Database Safety**: Automated backup before any schema changes
- **Deployment Failures**: Robust rollback mechanisms and health checks
- **Security Vulnerabilities**: Regular security audits and updates

### Business Risks
- **User Adoption**: Comprehensive training and gradual feature rollout
- **Data Loss**: Multiple backup strategies and version control
- **Performance Impact**: Load testing and performance monitoring
- **Maintenance Overhead**: Automated testing and monitoring systems


## Vision Statement

EG-Desk:Taehwa envisions transforming how global electrical sensor manufacturers approach content creation by providing an intuitive, AI-powered bilingual content automation system. The platform bridges the gap between technical expertise and content marketing, enabling non-technical users to create professional, SEO-optimized content for both Korean domestic and international markets.

By combining local-first architecture with drag-and-drop simplicity, the system empowers users to leverage their existing local assets—product specifications, technical documents, images—and transform them into compelling blog content through natural language conversations with AI.

The vision extends beyond simple content creation to encompass a complete workflow solution: from initial concept through bilingual optimization to automated publishing, all while maintaining the security and convenience of local file management without cloud dependencies.

This approach democratizes technical content creation, allowing businesses like Taehwa Trans to establish strong digital presence in multiple markets without requiring dedicated technical writing teams or complex development workflows.