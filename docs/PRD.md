# Product Requirements Document (PRD)
## AI Multimedia Localization Platform

| | |
|---|---|
| **Document** | Product Requirements Document |
| **Version** | 1.0 (Draft for review) |
| **Date** | 2026-07-05 |
| **Owner** | Product owner (you) · drafted by Product/Architecture |
| **Companion docs** | [ARCHITECTURE.md](ARCHITECTURE.md) (vision, models, roadmap) · [SAD.md](SAD.md) (system design) |
| **Working name** | "the Platform" — candidates: **Dubline**, **Loqal**, **Vocara**, **Polyglane** (decision pending, PRD is name-agnostic) |

**Purpose.** This PRD specifies the complete product: every feature of the commercial vision, described in enough detail to design and build from. Features carry a **phase tag** tying them to the delivery roadmap (P1–P4 from ARCHITECTURE.md §3, plus **PT** = post-thesis/commercial). "Complete vision, honest sequencing."

---

## Table of contents

1. [Product definition](#1-product-definition)
2. [Users & personas](#2-users--personas)
3. [Design language — an original premium UI](#3-design-language--an-original-premium-ui)
4. [Information architecture](#4-information-architecture)
5. [Feature specifications](#5-feature-specifications)
   - 5.1 [Video Translation](#51-video-translation) · 5.2 [Audio Translation](#52-audio-translation) · 5.3 [Document Translation](#53-document-translation) · 5.4 [Movie Translation](#54-movie-translation) · 5.5 [Podcast Translation](#55-podcast-translation) · 5.6 [Meeting Translation](#56-meeting-translation)
   - 5.7 [AI Dubbing](#57-ai-dubbing) · 5.8 [AI Voice Cloning](#58-ai-voice-cloning) · 5.9 [Multi-Speaker Detection](#59-multi-speaker-detection) · 5.10 [AI Character Detection](#510-ai-character-detection) · 5.11 [AI Chat](#511-ai-chat) · 5.12 [AI Summary](#512-ai-summary)
   - 5.13 [Subtitle Studio](#513-subtitle-studio) · 5.14 [Timeline Editor](#514-timeline-editor) · 5.15 [Voice Studio](#515-voice-studio)
   - 5.16 [Team Workspace](#516-team-workspace) · 5.17 [Cloud Storage](#517-cloud-storage) · 5.18 [Billing](#518-billing) · 5.19 [API Keys & Developer Platform](#519-api-keys--developer-platform) · 5.20 [Analytics](#520-analytics) · 5.21 [Enterprise Dashboard](#521-enterprise-dashboard) · 5.22 [Admin Dashboard](#522-admin-dashboard)
6. [Cross-cutting product requirements](#6-cross-cutting-product-requirements)
7. [Pricing & packaging](#7-pricing--packaging)
8. [Success metrics](#8-success-metrics)
9. [Release phasing matrix](#9-release-phasing-matrix)
10. [Out of scope](#10-out-of-scope)
11. [Open questions](#11-open-questions)

---

## 1. Product definition

**One-liner.** Upload any media — video, audio, film, podcast, meeting, or document — and receive a fully localized version in any target language: accurate subtitles, natural dubbed voices that preserve each speaker's identity and timing, and layout-faithful documents — with professional review tools and measurable quality on every job.

**What it is not.** Not a text translator with file upload bolted on. Not a one-click toy that produces unreviewable output. Not an avatar generator. The unit of value is a **localization project**: source media in, reviewed, quality-scored, deliverable-grade output out.

**Positioning.** Between the one-click consumer dubbing tools (fast, unreviewable, opaque quality) and enterprise localization service providers (high quality, slow, human-priced). The Platform delivers near-LSP quality at machine speed by pairing state-of-the-art open AI models with professional human-in-the-loop tooling and per-segment quality estimation that tells users *where* to look.

**Differentiators.**
1. **Quality you can see** — every segment carries a quality-estimation score; every job produces a quality report. No competitor exposes this honestly.
2. **Isochrony-aware dubbing** — translations are fitted to the original speech rhythm before synthesis (thesis research core), so dubs feel native, not read-over.
3. **Voice identity with consent governance** — cloned voices preserve speakers across languages; a consent registry makes this enterprise-deployable.
4. **Open-model economics** — hybrid open-source-first inference keeps unit costs and data-privacy stories that API-reseller competitors can't match.

---

## 2. Users & personas

| Persona | Profile | Primary jobs | Key features |
|---|---|---|---|
| **Maya — Creator** | YouTuber/course creator, 50–500k audience, solo | Localize videos to 3–5 languages to grow reach; fast turnaround; cost-sensitive | Video Translation, AI Dubbing, Subtitle Studio |
| **Daniel — Podcast producer** | Indie network, 4 shows, weekly cadence | Republish episodes in ES/DE/PT; keep host voices; show notes per language | Podcast Translation, Voice Cloning, AI Summary |
| **Priya — L&D manager** | Enterprise learning team, 2,000-employee company | Localize training video + slide decks to 8 languages; compliance sign-off; brand terminology | Video + Document Translation, Glossaries, Team Workspace, Enterprise Dashboard |
| **Tomás — Localization PM at an LSP** | Manages freelance linguists, broadcast/OTT clients | Machine-first draft + human post-edit workflow; QC against broadcast subtitle specs; client hand-off | Movie Translation, Subtitle Studio, Analytics, API |
| **Aisha — Ops lead** | Distributed company, meeting-heavy | Make all-hands and recorded meetings accessible across offices | Meeting Translation, AI Summary, AI Chat |
| **Platform operator (you)** | Runs the SaaS | Health, cost, abuse, support | Admin Dashboard |

---

## 3. Design language — an original premium UI

Inspiration studied (Synthesia, HeyGen, ElevenLabs, Runway, Notion, Linear, OpenAI) for *level of finish*, not for visuals. What those products share — and what we adopt as principles, not pixels: restrained palettes, typography doing the branding work, motion as feedback rather than decoration, density that respects professionals, and zero clip-art. The Platform's identity is deliberately its own:

### 3.1 Concept: **"The Light Desk"**

The metaphor is a modern dubbing studio's mixing desk in daylight — precision instruments, warm materials, calm confidence. Where competitors go dark-mode-neon ("AI product = black + purple glow"), we differentiate: **light-first, warm, editorial** — the tool feels like a well-lit studio, not a spaceship. (A true dark theme ships too — the *editors* default to dark for video work; see below.)

### 3.2 Visual system

- **Color.** Base: warm paper white (`#FAF9F6`-family) and deep ink (`#141210`-family) — never pure white/black. One signature accent: **saffron** (a warm amber-orange family) used sparingly for primary actions, progress, and QE highlights — chosen because no major AI SaaS owns orange-on-warm-neutral, and it reads as both premium and human. Semantic colors (success/warn/error) desaturated to sit inside the warm palette. Language pairs get a subtle deterministic hue system used in badges and timelines.
- **Dual-context theming.** Marketing site and dashboard: light, editorial, airy. **Studios (Subtitle, Timeline, Voice): dark by default** — professional media editing happens on dark surfaces for contrast against video content. The switch is contextual and automatic, and this two-world structure ("the office and the studio") becomes a recognizable product signature.
- **Typography.** Display: a modern editorial serif (e.g., family of Tiempos/Källa character) for marketing headlines and large numerals — this is the anti-Inter move that makes the brand not look like every AI startup. Product UI: a neutral grotesk (Inter-class) at a disciplined 4-step scale. Timecodes, QE scores, and all numerics: a tabular mono (JetBrains Mono-class) — numbers are a first-class citizen in this product and get their own voice.
- **Space & density.** 8-pt spatial system. Marketing breathes; dashboards are comfortable; studios are dense (Linear-grade information density, keyboard-first). Density is a per-surface decision, never a user toggle to compensate for bad defaults.
- **Motion.** Functional only: state transitions ≤ 200 ms ease-out; pipeline progress animates continuously (the "job is alive" signal is a core trust moment); no scroll-jacking, no ambient loops. One signature moment: on job completion, the run card settles with a single, quiet saffron sweep.
- **Iconography & illustration.** Stroke icons (Lucide-class), 1.5 px, no filled blobs. Illustration only as **real product UI** in marketing (à la Linear) — no abstract 3D renders, no robot mascots. Empty states use typographic composition, not clip art.
- **Voice & tone.** Copy is precise, calm, and honest about AI limits: "94% of segments passed quality checks — 12 segments need your review" not "✨ Magic translation complete!". Trust is the brand.

### 3.3 Signature UI elements (original, load-bearing)

1. **The Run Ribbon** — every processing job renders as a horizontal stage ribbon (probe → transcribe → translate → synthesize → mix), each stage a segment that fills in real time with per-stage timing. It is the product's heartbeat, visible on cards, run pages, and the API docs.
2. **QE Heat Rail** — in every studio, a thin vertical rail beside the segment list encodes per-segment quality scores as a heat strip; one glance shows *where* the 12 problem segments are in a 2-hour film. Click to jump. This is the visual embodiment of differentiator #1.
3. **Waveform Duet** — in dubbing review, original and dubbed waveforms render mirrored around a shared timeline, making isochrony visible (and demo-able) at a glance.
4. **Consent Seal** — cloned voices display a visible consent badge with provenance on hover; absence of the seal is impossible by construction. Governance as visible design.

### 3.4 Marketing site (P1 skeleton, PT polish)

Structure: Hero (product UI in motion — a real run ribbon completing, a dub playing side-by-side) → interactive demo (30-second sample video, pick a language, watch the pipeline) → capability sections (one per pipeline, each with a live artifact: a real subtitle file, a real waveform duet) → quality manifesto page (our metrics, publicly explained — nobody else dares) → pricing → docs. The interactive "try a sample" demo requires no signup and is the primary conversion instrument.

---

## 4. Information architecture

```
Marketing site (public)          App (authenticated)
├─ Home / interactive demo       ├─ Home — cross-project activity, resume work
├─ Product (per capability)      ├─ Projects
├─ Quality manifesto             │   └─ Project
├─ Pricing                       │       ├─ Library (assets: video/audio/docs)
├─ Docs / API reference          │       ├─ Runs (jobs; Run Ribbon list)
├─ Blog / research notes         │       │    └─ Run detail → opens a Studio
└─ Legal / trust center          │       ├─ Glossary & Translation Memory
                                 │       └─ Project settings (languages, defaults)
Studios (dark, full-screen)      ├─ Voice Studio (org-level voice library)
├─ Subtitle Studio               ├─ Analytics
├─ Timeline Editor               ├─ Workspace settings (members, roles)
└─ Voice Studio                  ├─ Storage
                                 ├─ Billing & Usage
                                 ├─ Developers (API keys, webhooks, logs)
                                 └─ Enterprise Dashboard (plan-gated)
Admin Dashboard (operator-only, separate surface)
```

Navigation: persistent left rail (workspace level) + project tabs; studios open full-screen with a return breadcrumb; global ⌘K command palette (Linear-grade) from P1 — search assets, jump to runs, trigger actions.

---

## 5. Feature specifications

Format per feature: **Phase** · What it is · Detailed capabilities · UX · Dependencies · Acceptance criteria (representative, not exhaustive).

---

### 5.1 Video Translation
**Phase P1 (subtitles) → P2 (dubbed video).** The flagship pipeline: any video in, localized video out.

**Capabilities**
- Ingest: MP4/MOV/MKV/WebM up to 10 GB (plan-tiered); YouTube/Vimeo URL import (PT, rights-attestation gated); batch upload.
- Auto source-language detection with confidence display and manual override.
- Target: 1–N languages per run (matrix run = one source → many targets, priced per target).
- Output modes per target: (a) subtitle files (SRT/VTT/TTML/burned-in), (b) dubbed audio track (P2), (c) fully dubbed + mixed video (P2), (d) multi-audio-track container (original + dubs, MKV/MP4 with language-tagged tracks).
- Every run produces: transcript, per-segment translations with QE scores, quality report, downloadable deliverables.
- Re-run economics: changing target language reuses the transcript (no re-transcription charge); editing source transcript invalidates only downstream stages (the stage-graph architecture surfaces directly as fair pricing).

**UX.** Upload → language + output-mode picker (with per-choice cost estimate *before* confirmation — no surprise billing, ever) → Run Ribbon page with live stage progress → "Review" CTA into Subtitle Studio / Timeline Editor → Export panel.

**Dependencies.** ASR, MT, subtitle segmentation (P1); dubbing chain (P2); SAD pipeline templates.

**Acceptance (sample).** A 10-min 1080p video to 2 target languages completes subtitle mode in ≤ 3 min wall-clock (warm); deliverables validate against SRT/VTT specs; cost shown pre-run matches billed amount exactly.

---

### 5.2 Audio Translation
**Phase P1 (transcript+translation) → P2 (dubbed audio).** The video pipeline minus frames — but with audio-native deliverables.

**Capabilities**
- Ingest: MP3/WAV/FLAC/M4A/OGG, up to 4 h (tiered).
- Outputs: translated transcript (TXT/DOCX/JSON), timed captions, translated voice track (P2) with three voice modes — cloned original voice, chosen library voice, or per-speaker mapping (§5.9).
- Music/effects preservation: source separation keeps the non-speech bed under the dubbed voice (P2).
- Loudness-normalized deliverables (EBU R128 / podcast −16 LUFS presets).

**UX.** Same run flow; review opens Subtitle Studio in audio mode (waveform-only, no video pane).

**Acceptance (sample).** A 60-min interview yields speaker-attributed translated transcript; dubbed output duration within ±2% of source; music bed audibly preserved (MOS check in QA).

---

### 5.3 Document Translation
**Phase P4.** Layout-preserving localization of formatted documents — the pipeline that shares the translation core but not the media chain.

**Capabilities**
- Formats: PDF, DOCX, PPTX, XLSX, SRT/VTT (as documents), HTML/Markdown; scanned PDFs via OCR.
- **Layout fidelity is the feature**: translated text re-flowed into the original structure — styles, tables, footnotes, alt-text; font-size auto-fit when target text expands (DE +30% vs EN is the classic failure).
- Glossary + translation memory applied per project (shared with all media pipelines — a term translated in the training video matches the slide deck).
- Side-by-side review UI: source page ↔ target page, segment-level editing, QE heat rail.
- Batch mode: a folder of documents as one run with per-file status.

**Dependencies.** MT/LLM providers (existing); new ingestion/render workers (format parsing, re-rendering); review UI variant.

**Acceptance (sample).** A 40-slide PPTX round-trips with 100% of text nodes translated, zero layout overflow errors above severity threshold, and all glossary terms enforced.

---

### 5.4 Movie Translation
**Phase P3.** Long-form, multi-character, broadcast-grade localization — the pipeline that stresses everything and earns LSP/OTT credibility.

**Capabilities**
- Long-form handling: multi-hour ingest, chapter/scene segmentation (shot detection), per-scene processing with global consistency (character names, terminology stable across 2 h).
- **Character casting board:** detected characters (§5.10) mapped to voices — clone the original actor (consent-gated) or cast from the voice library; per-character voice direction (age/energy notes to TTS).
- Screenplay-aware subtitling: broadcast constraint presets (Netflix-style CPS/CPL/duration rules, per-market presets), forced narratives, on-screen-text events, SDH/closed-caption variants.
- Dubbing with scene-level review: emotion/intensity flags from source audio inform synthesis; per-scene approval workflow for studio QC teams.
- Deliverables: TTML/IMSC subtitle masters, per-language audio stems, M&E (music & effects) + dialogue stems, as-broadcast package manifest.

**UX.** A movie run opens the **Timeline Editor** (§5.14) as its primary surface, with the casting board and scene list as side panels.

**Dependencies.** Everything in P1–P2 + character detection, shot detection, stem management; heaviest GPU profile.

**Acceptance (sample).** A 90-min feature produces per-scene dubbed audio with character-consistent voices (same character = same voice across all scenes, verified automatically), subtitle master passes Netflix-preset validation with zero hard violations.

---

### 5.5 Podcast Translation
**Phase P2.** Episodic, voice-identity-centric, publish-ready.

**Capabilities**
- Ingest: audio upload or **RSS feed connect** — new episodes auto-localize on publish (the retention feature; PT for auto-mode).
- Host/guest voice persistence: recurring speakers matched to their registered cloned voices across episodes (voiceprint matching against the org's Voice Studio library).
- Episode packaging: translated title, description, chapter markers, and show notes (via AI Summary §5.12) per language.
- Output: localized episode audio (music/intro bed preserved), per-language RSS feed generation (PT) so localized shows are directly submittable to podcast platforms.
- Conversational fidelity: overlap handling, laughter/interjection preservation policy (configurable: translate, keep original, or drop).

**Acceptance (sample).** A recurring 2-host show localizes episode 2 with the same two cloned voices used in episode 1 without re-registration; generated show notes match episode content (spot-check rubric).

---

### 5.6 Meeting Translation
**Phase P4 (recordings) → PT (live).** Recorded meetings first; live interpretation is a declared future bet, not a launch promise.

**Capabilities**
- Ingest: recording upload; Zoom/Meet/Teams cloud-recording import via integrations (PT).
- Speaker-attributed translated transcript with timestamps; speakers matched to workspace members where possible (name mapping UI).
- Meeting deliverables: translated transcript, **AI Summary** (decisions, action items with owners, open questions — §5.12), searchable archive, translated caption track for replay.
- AI Chat over the meeting (§5.11): "What did we decide about the Q3 budget?" answered in the viewer's language with timestamp citations.
- Privacy defaults: meeting content is retention-limited by workspace policy, excluded from any model-improvement data by default, and access-scoped to invited members.
- Live mode (PT, explicitly experimental): real-time translated captions via streaming ASR+MT; latency target < 4 s; no live dubbing promised.

**Acceptance (sample).** A 45-min recorded meeting yields an attributed transcript in ≤ 10 min; action-item extraction achieves agreed precision on the eval rubric; access control verified against non-invited workspace members.

---

### 5.7 AI Dubbing
**Phase P2.** The synthesis engine behind video/movie/podcast dubbing — specified once, consumed by all pipelines.

**Capabilities**
- **Isochrony-fitted translation:** target text is rewritten/re-ranked to fit each segment's duration budget before synthesis (the thesis contribution, productized). Per-segment fit indicator in review (the Waveform Duet, §3.3).
- Voice modes: cloned source speaker (§5.8), library voice, per-speaker cast (§5.9/§5.10).
- Prosody transfer: pace, pauses, and emphasis patterns carried from source audio into synthesis where the engine supports it; per-segment intensity control in review.
- Background preservation: dialogue/music separation, dubbed speech mixed over the original bed with auto-ducking and loudness normalization.
- **Per-segment regeneration:** in any studio, edit the text or adjust direction → re-synthesize that segment only, in seconds (interactive warm endpoint per SAD §14.3).
- Multi-take: generate N takes per segment, pick per segment; takes are kept for A/B.
- Transparency: dubbed outputs are labeled as synthetic and watermarked where the engine permits (EU AI Act posture; SAD §16.4).

**Acceptance (sample).** ≥ 90% of segments within ±10% duration of source without manual stretch; single-segment regeneration round-trip ≤ 15 s p95; output loudness within spec.

---

### 5.8 AI Voice Cloning
**Phase P2.** Voice identity as a governed, reusable asset.

**Capabilities**
- **Instant clone:** 30–60 s of clean reference audio → usable voice (open-model engines; premium engine via ElevenLabs tier).
- **In-content clone:** extract a speaker's voice directly from an uploaded video/podcast (via diarization + separation) with one click — "dub this speaker in their own voice" without a separate recording session.
- **Consent-gated by construction (non-negotiable):** every voice requires a ConsentRecord — self-recorded consent phrase or uploaded signed consent artifact; the Consent Seal (§3.3) displays provenance; revocation hard-deletes the voice and blocks dependent runs (SAD §16.5).
- Voice library per workspace: naming, tags, language coverage indicators, sample playback, usage history (which runs used this voice).
- Quality feedback: post-clone similarity score + guidance ("reference too noisy — try a cleaner 45 s clip").
- Cross-language synthesis: one registered voice speaks all supported target languages.

**Acceptance (sample).** Clone-to-first-synthesis ≤ 3 min; a voice with revoked consent is unusable within seconds and its embeddings are verifiably deleted; no synthesis path exists that bypasses the consent check (security test).

---

### 5.9 Multi-Speaker Detection
**Phase P1 (detection) → P2 (per-speaker dubbing).** Diarization as a product feature, not a checkbox.

**Capabilities**
- Automatic speaker separation with count estimation; per-segment speaker attribution displayed as colored speaker chips throughout all studios.
- **Speaker board:** rename speakers ("Speaker 2" → "Dr. Chen"), merge/split diarization errors with two clicks, reassign individual segments.
- Per-speaker localization policy: each speaker independently mapped to a voice mode (clone / library / keep-original-untranslated — e.g., leave the interviewee in French, dub only the host).
- Voiceprint persistence (P2): recurring speakers recognized across a project's assets (powers Podcast §5.5).
- Overlap handling: overlapping speech flagged for review rather than silently mangled.

**Acceptance (sample).** DER (diarization error rate) tracked per release on benchmark sets; speaker merge/split operations propagate to all downstream artifacts (translations, dubs) consistently.

---

### 5.10 AI Character Detection
**Phase P3.** The movie-grade layer above speaker detection: *who is on screen, and who is speaking*.

**Capabilities**
- Face detection + tracking + clustering across a film → character gallery with representative thumbnails and screen-time stats.
- **Audio-visual speaker binding:** fuses diarization with on-screen active-speaker detection so voices attach to characters, not just audio clusters — this is what makes per-character casting (§5.4) reliable, including off-screen lines.
- Character naming (manual or cast-list import); character-level metadata feeds subtitling (speaker labels in SDH) and dubbing (casting board).
- On-screen text detection (signs, inserts, titles) → flagged as forced-narrative subtitle candidates.
- Explicitly **not** identity recognition against external databases — clustering within the content only (privacy line, stated in product).

**Acceptance (sample).** On a benchmark film, ≥ 95% of dialogue segments bind to the correct character cluster after ≤ 15 min of human gallery cleanup; forced-narrative candidates achieve agreed recall.

---

### 5.11 AI Chat
**Phase P2 (per-asset) → P4 (workspace-wide).** Conversational access to everything the pipeline already knows.

**Capabilities**
- **Chat with your media:** ask questions about any transcribed asset ("Where does she mention pricing?", "Summarize the argument in section 2") — answers cite timestamped segments; clicking a citation seeks the player.
- **Chat as a localization copilot in the studios:** "Make segments 40–60 more formal", "Why is this segment flagged?", "Apply the glossary term for 'churn' everywhere" — chat can propose batch edits which render as a reviewable diff (never silently applied).
- Cross-lingual: ask in any language about content in any language.
- Workspace-wide mode (P4): retrieval across all assets in a project/workspace ("Which training videos mention the old refund policy?") — powered by embeddings over transcripts (search infrastructure shared with §5.17).
- Grounding rules: answers only from asset content + citations; explicit "not found in this content" behavior; no open-web answering inside the product.

**Acceptance (sample).** Citation-precision rubric ≥ agreed threshold; batch-edit proposals always render as diffs requiring confirmation; retrieval latency p95 < 3 s per-asset, < 6 s workspace-wide.

---

### 5.12 AI Summary
**Phase P2.** Every long asset becomes navigable and shareable.

**Capabilities**
- Auto-generated per asset: abstract (3 lengths: one-liner / paragraph / full), chapter markers with titles, key topics, named entities.
- Type-aware templates: podcast → show notes + pull quotes; meeting → decisions, action items (owner + due date candidates), open questions; lecture/course → learning objectives + section recaps; film → synopsis (spoiler-leveled).
- **Multilingual by default:** summaries generated in every target language of the run, not just the source.
- Editable: summaries are documents, not blobs — edit, regenerate section-wise, export (MD/DOCX/PDF) or push via API/webhook.
- Chapters feed players (chapter rail in studios) and export as YouTube chapter text / podcast chapter tags.

**Acceptance (sample).** Faithfulness rubric (no hallucinated claims) on eval set; chapter boundaries within tolerance of human-marked ground truth; all target languages delivered.

---

### 5.13 Subtitle Studio
**Phase P1.** The flagship P1 surface — a professional subtitle post-editing environment (dark theme, keyboard-first).

**Capabilities**
- Three-pane layout: video player (top) · **Waveform** with segment blocks (middle, zoomable, drag-to-retime) · **Segment table** (bottom): source | target | speaker chip | QE score | constraint status.
- **QE Heat Rail** (§3.3) for instant navigation to problem segments; filter by score band / flag / speaker.
- Broadcast constraint engine, live: CPS, CPL, line count, duration, gap rules validated as-you-type with preset packs (Netflix-style, EBU, custom per project); violations are visible, explained, and exportable as a QC report.
- Editing: inline target editing with undo tree; split/merge segments (timings recomputed); retime by dragging block edges on the waveform; find-and-replace with glossary awareness; batch operations via AI Chat (§5.11) as reviewable diffs.
- Translation candidates: per segment, view alternate MT/LLM candidates and the isochrony variant; one-click swap; "why flagged" explanation from QE.
- Keyboard-first: full operation without mouse (tab/shortcut map published); ⌘K palette in-studio.
- Collaboration (PT): presence, per-segment comments/@mentions, suggest-mode edits, approval state per segment → per run.
- Export: SRT, VTT, TTML/IMSC, SDH variant, burned-in render (media worker), plus QC report.

**Acceptance (sample).** A trained user post-edits at ≥ 30 segments/min for trivial confirmations; constraint validation latency imperceptible (< 50 ms); all edits captured as EditEvents (audit + thesis data, SAD §11).

---

### 5.14 Timeline Editor
**Phase P2 (dubbing review) → P3 (full multitrack).** The studio for *sound and picture together* — where dubbing and movies are reviewed.

**Capabilities**
- Multitrack timeline: video track · original dialogue · dubbed dialogue (per language tab) · music & effects bed · subtitle track — vertically stacked, synced, zoom 1 s–full duration.
- **Waveform Duet** (§3.3): original vs dub mirrored per segment; isochrony fit visible; off-budget segments glow on the heat rail.
- Per-segment dubbing controls: play A/B (original ↔ dub, hotkey toggle), regenerate with direction notes, choose among takes, nudge timing (snap to VAD boundaries), per-segment gain.
- Mix controls: bed ducking amount, global dub gain, loudness target preset; scene-level mute/solo.
- Scene rail (P3): shot-detected scene strip for navigation; per-scene approval status (movie QC workflow §5.4).
- Character lane (P3): casting board integration — segments colored by character, click a character to solo their lines.
- Renders: preview render (fast, watermarked) vs final render (full quality) — explicit, priced difference.

**Acceptance (sample).** A/B toggle latency < 100 ms; timeline stays responsive on a 2 h film with 3 dub languages (virtualized rendering); regeneration updates the timeline without full reload.

---

### 5.15 Voice Studio
**Phase P2.** The workspace's voice asset manager — where voice identity is created, governed, and directed.

**Capabilities**
- Voice library: cloned voices (§5.8) + curated stock library (licensed/open voices with clear usage rights, filterable by language/gender/age/style).
- Voice detail page: samples across languages, similarity score, consent provenance (the Consent Seal), usage history, engine tier (open/premium).
- **Audition board:** type or paste a line, select N voices, generate side-by-side auditions — the casting tool for §5.4/§5.9.
- Direction presets: named style presets per voice (pace, energy, formality hints) reusable across runs.
- Governance: consent lifecycle (grant → verify → revoke), role-gated creation (admin+, §12.3 of SAD), org-level policy toggles (e.g., "clones require owner approval").
- Pronunciation lexicon: per-workspace phonetic overrides (names, brand terms) applied at synthesis across all pipelines.

**Acceptance (sample).** Audition of 4 voices × 1 line returns in ≤ 20 s total; revocation propagates (§5.8); lexicon entries verifiably alter synthesis in all engines that support them.

---

### 5.16 Team Workspace
**Phase P1 (basic) → PT (full collaboration).** Multi-tenancy as lived experience.

**Capabilities**
- Workspaces (= orgs): people, projects, voices, glossaries, storage, billing under one roof; users can belong to multiple workspaces (fast switcher).
- Roles: owner / admin / editor / viewer (RBAC per SAD §12.3); per-project access restriction (PT) for client-separated LSP work.
- Invitations by email with role; pending/expired management; domain auto-join (PT, verified domains).
- Shared assets: glossaries and translation memories are project-scoped with workspace-level defaults; voice library is workspace-scoped.
- Activity feed: who ran/edited/exported what, when — filterable, per project and workspace.
- Review workflows (PT): assign segments/runs to members, approval chains (translator → reviewer → sign-off), status board per run.
- External share links: view-only run/report links with expiry and optional password (client hand-off without seats).

**Acceptance (sample).** Role matrix enforced across every surface (automated authz test suite); a viewer can never mutate; share links expire correctly and leak nothing beyond their scope.

---

### 5.17 Cloud Storage
**Phase P1.** The media library — organized, searchable, quota-managed.

**Capabilities**
- Library per project: folders, tags, list/grid views with thumbnails and duration/size/language badges; bulk actions.
- Resumable, direct-to-storage uploads (10 GB tier-capped); drag-and-drop anywhere in the app; URL import (PT).
- **Deep search:** filename + metadata + full-text across transcripts ("find the clip where we said 'carbon neutral'") — transcript search ships P1 (Postgres FTS), semantic search PT (shared embeddings with §5.11).
- Every asset shows its derivation tree: source → runs → artifacts → exports (the immutable artifact graph from SAD P4, made visible).
- Quotas: per-plan storage limits with clear usage bars; lifecycle transparency (exports 30 d, intermediates 90 d — surfaced in UI, not buried in ToS); per-asset pin/keep-forever toggle.
- Trash with 30-day recovery; deletion cascades verifiably (GDPR posture, SAD §13.4).
- Integrations (PT): Google Drive/Dropbox import, S3 bucket connect (enterprise BYO-storage).

**Acceptance (sample).** 5 GB upload survives a network drop and resumes; transcript search returns in < 500 ms p95; deleting an asset removes all derived storage keys (verified by audit job).

---

### 5.18 Billing
**Phase PT (Stripe live) — cost metering built from P1.** Usage-based, transparent, no surprise invoices.

**Capabilities**
- **Unit: processing credits**, priced per media-minute per operation class (transcribe < translate < dub < lip-sync) and per engine tier (open-model standard vs premium API engines) — the provider-abstraction tiers (SAD §4.1) surfaced as honest pricing.
- Pre-run cost estimate on every run configuration (binding, not indicative); running total per project.
- Plans (§7): monthly credit allowances + rollover rules; overage at pay-as-you-go rate with a hard-cap toggle ("never exceed my plan" — the cost-anxiety killer, default ON for self-serve).
- Self-serve: card via Stripe, invoices, VAT handling, plan up/downgrade with proration; usage dashboard per member/project/pipeline (feeds §5.20).
- Enterprise: annual contracts, PO/invoice billing, committed-use discounts, custom rate cards (managed via Admin §5.22).
- Failed-payment dunning with grace period; data never held hostage (export remains available read-only).

**Acceptance (sample).** Billed amount always equals pre-run estimate for unchanged runs; hard-cap verifiably blocks the run that would exceed it (with a clear pre-flight message); Stripe webhook failures never double-charge (idempotent reconciliation).

---

### 5.19 API Keys & Developer Platform
**Phase P2 (keys + core API) → PT (full platform).** The product is API-first by architecture (SAD §6); this feature makes it a business line.

**Capabilities**
- API keys per workspace: scoped (read / write / admin), named, last-used tracking, instant revoke, roll with overlap window.
- Full REST API parity with the UI for the core loop: upload → run → poll/webhook → fetch deliverables (the resource catalog of SAD §6.2).
- Webhooks: per-endpoint event subscriptions, HMAC-signed, delivery log with replay button, test-fire tool.
- Developer console in-app: interactive API reference (from OpenAPI), request logs with trace IDs (join with support), usage per key, rate-limit status.
- Sandbox mode (PT): test key that runs the pipeline on tiny models at zero credit cost with watermarked output — lets developers integrate before paying.
- SDKs (PT): generated TypeScript + Python clients, versioned with the API.

**Acceptance (sample).** The entire §5.1 happy path is executable via API with zero UI touches; a revoked key fails within seconds everywhere; webhook replay is idempotent for consumers following the docs.

---

### 5.20 Analytics
**Phase P2 (basic) → PT (full).** The customer-facing mirror of the platform's own telemetry: *what did we localize, how good was it, what did it cost.*

**Capabilities**
- Volume: media-minutes processed by pipeline/language-pair/member over time; run success/failure rates; turnaround-time distributions.
- **Quality analytics (the differentiator):** QE score distributions per language pair and engine tier over time; human-edit rate (how much did reviewers change — the honest quality metric); glossary-compliance rate; per-project quality trendlines. "Your German dubs improved 14% since switching tiers" is a sentence no competitor can render.
- Cost analytics: credits by project/pipeline/member; cost per delivered minute; tier-mix optimization hints ("38% of your premium-tier segments scored identically to standard tier on similar content").
- Reach (PT, optional integrations): published-output performance pulled from YouTube/podcast platforms per language — closing the loop from localization spend to audience growth.
- Exports: CSV/API for all analytics; scheduled email digests (weekly workspace report).

**Acceptance (sample).** Analytics lag < 5 min behind events; numbers reconcile exactly with Billing (§5.18) and Admin (§5.22) views — one metering source of truth (SAD cost accounting).

---

### 5.21 Enterprise Dashboard
**Phase PT.** The buyer-facing control plane for compliance-conscious organizations (plan-gated).

**Capabilities**
- **Governance:** SSO (SAML/OIDC) configuration, SCIM user provisioning, enforced MFA, session policies (duration, IP allowlists).
- **Audit:** full audit-log explorer (auth events, permission changes, exports, deletions, consent lifecycle — the append-only stream from SAD §18.2) with filters and SIEM export (webhook/S3 drop).
- **Data controls:** retention policy configuration per project class; data-residency display (where every byte lives); DSR console (subject access/deletion requests with cascade verification reports); legal hold pinning.
- **AI governance:** engine allowlist (e.g., "no data to third-party APIs" → locks workspace to self-hosted open models — the hybrid architecture as a compliance feature), voice-consent policy enforcement level, synthetic-media labeling policy.
- **Spend governance:** department/project budgets, approval thresholds ("runs > 500 credits need admin approval"), consolidated invoicing across child workspaces.
- Security posture page: subprocessor list, certifications status, DPA download, uptime/SLA reporting.

**Acceptance (sample).** SSO-enforced workspace rejects password login; engine allowlist verifiably prevents any premium-API call (network-level assertion in tests); audit export is complete and tamper-evident (hash chain).

---

### 5.22 Admin Dashboard
**Phase P1 (minimal) → grows with the product.** The operator's surface (you, then your team) — separate app surface, separate auth, not visible to customers.

**Capabilities**
- **Operations:** live queue depths and worker fleet status per class (the SAD §17 metrics, rendered); stuck-run inspector with safe actions (retry stage, abort run, requeue); DLQ browser with full task context; GPU spend rate live vs budget with kill-switch concurrency caps.
- **Model operations:** model registry management (versions, licenses, cost basis — SAD §4.2); tier routing rules; canary rollout controls (route N% of runs to a new model version); benchmark scorecard diffing before promotion (the §15.2 gate, operated from here).
- **Customer operations:** workspace directory with plan/usage/health; impersonation with consent + full audit trail (support tool); manual credit grants/adjustments; abuse triage queue (§16.1 flags: consent violations, content reports, cost anomalies) with account actions (warn/limit/suspend).
- **Platform config:** plan/rate-card editor, feature flags per workspace (how P3 experimental features roll out), announcement banners, maintenance mode.
- **Business view:** MRR, conversion funnel, cohort retention, unit economics (gross margin per pipeline class — GPU-seconds metering rolled up).

**Acceptance (sample).** Operator can diagnose and unstick any failed run without shell access; every admin action lands in the audit log; impersonation is impossible without recorded justification.

---

## 6. Cross-cutting product requirements

- **Language coverage.** Launch matrix (P1): source = any of ~90 ASR languages; targets = top 30 MT-strong languages, with per-pair quality grades (A/B/experimental) published honestly in-product. Dubbing (P2) launches with the 10–15 languages the chosen TTS engines handle credibly. *(Final pair priorities: open question #1.)*
- **Quality transparency.** Every run: a quality report (per-stage metrics, QE distribution, flags). Every marketing claim links to the public quality manifesto. This honesty is brand-level strategy.
- **Accessibility.** WCAG 2.1 AA across the app; studios fully keyboard-operable; the product that makes content accessible must be accessible.
- **UI localization.** The app UI itself ships in 6+ languages by PT (dogfooding: localized with the Platform).
- **Performance.** Studio interactions < 100 ms perceived; run-page live updates < 2 s from event; pipeline latency targets per SAD §1.5.
- **Trust & safety.** Consent-gated cloning everywhere (SAD §16.5); synthetic-media labeling; prohibited-use policy with enforcement tooling (§5.22); rights attestation on URL imports.
- **Data ethics (thesis + product).** Customer content never trains models without explicit opt-in; opt-in state visible in Enterprise Dashboard.

## 7. Pricing & packaging (PT; directional)

| Plan | For | Shape |
|---|---|---|
| **Free** | Trial/students | ~30 min/mo transcribe+subtitle, watermarked exports, 1 seat, community support |
| **Creator** (~$24/mo) | Maya | ~300 credits/mo, dubbing on open engines, 2 clones, 3 seats |
| **Studio** (~$89/mo) | Daniel, small teams | ~1,500 credits, premium engine access, 10 clones, workflows, API |
| **Business** (~$399/mo) | Priya, Tomás | High allowance, per-project access, priority queue, analytics+, SLA-lite |
| **Enterprise** (custom) | Compliance buyers | §5.21 features, SSO/SCIM, engine allowlists, DPA/SLA, invoicing |

Principles: credits map to metered GPU-seconds with target ≥ 70% gross margin per class; open-model tier keeps a permanently cheap floor competitors reselling APIs can't follow; hard-cap default protects self-serve trust.

## 8. Success metrics

| Horizon | Metric | Target |
|---|---|---|
| Thesis | RQ1–RQ3 results publishable; benchmark harness reproducible end-to-end | pass |
| Activation | signup → first completed run | > 40% |
| Value moment | first export ≤ 30 min from signup | > 60% of activated |
| Quality trust | % runs where user opens ≤ 5 flagged segments and exports (QE routing works) | growing |
| Retention | month-2 workspace retention (self-serve) | > 35% |
| Efficiency | human-edit rate trend per language pair | declining |
| Unit economics | gross margin per pipeline class | ≥ 70% |

## 9. Release phasing matrix

| Phase | Features (from §5) |
|---|---|
| **P1 — Subtitle core** (M0–M3) | 5.1 (subtitle mode), 5.2 (transcript mode), 5.9 (detection), 5.13 Subtitle Studio, 5.16 (basic workspace), 5.17 Storage, 5.22 (minimal admin) |
| **P2 — Voice** (M4–M5) | 5.7 Dubbing, 5.8 Cloning, 5.15 Voice Studio, 5.14 Timeline (dubbing mode), 5.5 Podcast, 5.11 (per-asset chat), 5.12 Summary, 5.19 (keys + API), 5.20 (basic analytics) |
| **P3 — Cinema** (M6+) | 5.4 Movie, 5.10 Character Detection, 5.14 (full multitrack), lip-sync (experimental flag) |
| **P4 — Breadth** | 5.3 Documents, 5.6 Meetings (recorded), 5.11 (workspace chat) |
| **PT — Commercial** | 5.18 Billing live, 5.21 Enterprise, 5.16 (full collab), integrations, live meetings, SDKs, marketing polish |

## 10. Out of scope (explicit)

Avatar/talking-head generation (Synthesia's territory — we localize real content); text-to-video; simultaneous live *dubbing* (live captions only, PT); human translator marketplace (integrate, don't operate — possible partner API later); mobile native apps (responsive web only until demand proves otherwise); on-prem deployment (containers make it feasible; not productized before Enterprise demand).

## 11. Open questions

1. Launch language pairs and dubbing language priorities (drives §6 coverage and TTS engine weighting).
2. Product name + domain (candidates in header) — needed before marketing site work.
3. Free-tier generosity vs GPU cost exposure — validate with real P1 unit costs.
4. LSP workflow depth (§5.16 approval chains): partner with one design-partner LSP, or defer until inbound?
5. Podcast RSS auto-publish legalities per platform (Spotify/Apple ToS review) before promising §5.5 feed generation.

---

*End of PRD. Review requested on: §3 design language (the light-first/saffron identity is a deliberate contrarian bet), §7 pricing shape, and the §9 phase assignments.*
