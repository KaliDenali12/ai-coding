# Conspiracy Board — Full Build Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Conspiracy Board app from PRD to production-ready, including all P0/P1 features and comprehensive tests.

**Architecture:** Single-page React app (Vite + TypeScript) with a single Netlify Function as Claude API proxy. No database, no auth, no routing. Three visual states: landing -> loading -> corkboard. Framer Motion for orchestrated animations, CSS 3D for card flips, SVG stroke-dash for red strings.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Shadcn/UI, Framer Motion, Vitest + React Testing Library, Netlify Functions, Claude API (Anthropic SDK), Google Fonts (12+)

---

## Phase 1: Project Scaffolding & Configuration
- Vite + React + TypeScript project setup
- Tailwind CSS configuration
- Shadcn/UI initialization
- Path aliases (@/)
- Netlify config (netlify.toml)
- Google Fonts loading
- Base CSS with dark theme variables
- Vitest + RTL setup
- **Commit**: "feat: project scaffolding with Vite, Tailwind, Shadcn, Vitest"

## Phase 2: Types, Constants & Core Utilities
- src/types/conspiracy.ts — all TypeScript types
- src/lib/fonts.ts — font category -> Google Font mapping
- src/lib/blocklist.ts — input blocklist with obfuscation handling
- src/lib/api.ts — client-side fetch wrapper
- src/lib/constants.ts — example chips, loading messages, error messages
- Tests for blocklist, fonts mapping, constants
- **Commit**: "feat: types, font mappings, blocklist, and utility modules with tests"

## Phase 3: Landing Screen
- LandingScreen.tsx — dark themed input screen
- Dual input fields with validation (non-empty, different, not blocklisted)
- Example chips with auto-fill + auto-submit
- Submit button with disabled state
- Styled with typewriter/classified aesthetic
- Tests for input validation, chip behavior
- **Commit**: "feat: landing screen with inputs, chips, and validation"

## Phase 4: Netlify Function — Claude API Proxy
- netlify/functions/generate.ts
- System prompt with tone, structure, safety, font categories
- Server-side input validation (blocklist)
- Response JSON validation (7 nodes, required fields, valid font categories)
- Error handling with appropriate HTTP status codes
- Tests for validation logic
- **Commit**: "feat: Netlify Function with Claude API integration and validation"

## Phase 5: Loading Screen
- LoadingScreen.tsx — immersive themed loading
- CLASSIFIED stamp animation
- Flickering status messages (cycling every 1.5s)
- Timeout handling (8s secondary message, 15s auto-fail)
- Smooth transition support
- Tests for timeout logic
- **Commit**: "feat: themed loading screen with stamps and timeout handling"

## Phase 6: Layout Algorithm
- src/lib/layout.ts — card position calculator
- Zigzag pattern with organic jitter
- Desktop (left-to-right) and mobile (top-to-bottom) modes
- Random rotation per card (1-4 degrees)
- No overlap detection
- Comprehensive tests for layout calculations
- **Commit**: "feat: corkboard layout algorithm with zigzag positioning"

## Phase 7: Polaroid Cards
- PolaroidCard.tsx — full Polaroid component
- Front face: emoji, dynamic font text, handwritten title
- Back face: briefing text in readable sans-serif
- 3D flip interaction (CSS transforms)
- Push pin, rotation, drop shadow
- Single-card-flipped-at-a-time logic
- Tests for flip behavior
- **Commit**: "feat: Polaroid card component with 3D flip interaction"

## Phase 8: Red Strings (SVG)
- RedString.tsx — SVG path component
- Bezier curve calculation between card positions
- Stroke-dasharray/dashoffset CSS animation
- Deep red styling, organic curves
- Tests for path calculation
- **Commit**: "feat: red string SVG component with drawing animation"

## Phase 9: Corkboard, Reveal & State Machine
- Corkboard.tsx — board container with cork texture
- RevealSequence.tsx — Framer Motion timeline orchestrator
- CaseFileStamp.tsx — decorative stamp flourish
- App.tsx — full state machine (input -> loading -> board)
- AnimatePresence transitions
- "New Investigation" button
- Tests for state transitions
- **Commit**: "feat: corkboard reveal animation and app state machine"

## Phase 10: Error Handling
- ErrorScreen.tsx — themed error variants
- Random message selection
- Retry with preserved inputs
- Integration with API failure states
- Tests for error display and retry
- **Commit**: "feat: themed error screens with retry"

## Phase 11: Mobile & Responsive
- Mobile layout (< 768px)
- Stacked inputs, top-to-bottom card flow
- Scaled Polaroids for narrow viewports
- Responsive string paths
- **Commit**: "feat: mobile responsive layout"

## Phase 12: Final Polish & Integration Tests
- End-to-end flow verification
- Integration tests for full user journey
- Visual polish pass
- Build verification
- **Commit**: "feat: integration tests and final polish"
