---
name: Smart Eco Community WiFi
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4851'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707882'
  outline-variant: '#bfc7d3'
  surface-tint: '#00639c'
  primary: '#006098'
  on-primary: '#ffffff'
  primary-container: '#007abf'
  on-primary-container: '#fdfcff'
  inverse-primary: '#98cbff'
  secondary: '#006d3c'
  on-secondary: '#ffffff'
  secondary-container: '#72fda8'
  on-secondary-container: '#007440'
  tertiary: '#145ca7'
  on-tertiary: '#ffffff'
  tertiary-container: '#3975c2'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#98cbff'
  on-primary-fixed: '#001d33'
  on-primary-fixed-variant: '#004a77'
  secondary-fixed: '#72fda8'
  secondary-fixed-dim: '#52df8e'
  on-secondary-fixed: '#00210e'
  on-secondary-fixed-variant: '#00522c'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#a6c8ff'
  on-tertiary-fixed: '#001c3b'
  on-tertiary-fixed-variant: '#004787'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: -0.022em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.018em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 25px
    letterSpacing: -0.012em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  numeric-stat:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an accessible, high-trust, and hyper-fluid community network experience designed specifically for mobile Progressive Web Apps (PWA) in Haiti. Rooted in the visual momentum of the swirling kinetic "S" logo, the interface balances Apple iOS 17 Human Interface Guidelines (translucent vibrancy, tight typography, segmented control groupings) with the warmth, resilience, and vitality of everyday Haitian connectivity.

### Personality & Tone
- **Reassuring & Resilient:** WiFi connectivity is a lifeline for business, education, and family. Visual states prioritize absolute clarity: connection health (dBm signal, ping latency), voucher balances in Haitian Gourdes (HTG), and instant payment verification via MonCash, Natcash, and Kobara.
- **Fluid & Luminous:** Taking inspiration from the chromatic gradient flow in the brand logo, surfaces use layered optical glass, refractive blur backdrops, and luminous gradients stretching from deep sapphire oceanic blues to energetic tropical mint greens.
- **Native-Grade iOS Feel:** The mobile browser shell disappears. Tap feedback, dynamic island-style toast notifications, hairline separators, and soft rubber-band gestures deliver an unmistakable native iOS 17 ergonomics.

## Colors

The palette directly extrapolates the fluid ribbon of the brand mark: deep maritime blues ascending through electric cerulean and cyan to a vivid mint green.

### Palette Architecture
- **Primary (`#1490DF` - Azure Blue):** Primary navigation, interactive controls, and active WiFi states.
- **Secondary (`#4DDB8A` - Bright Mint):** Network online indicators, successful transactions, data balance replenishment, and high-speed indicators.
- **Tertiary (`#0C59A4` - Deep Sapphire):** High-contrast anchors, dark-mode header depth, brand accents, and active focus rings.
- **Quaternary Accent (`#2CC4E3` - Electric Cyan):** Midpoint bridge used in hero linear gradients and network pulse rings.
- **Neutral Surface Palette (Light Mode):**
  - App Canvas: `#F8FAFC` (Slate 50)
  - Card Background: `#FFFFFF` (Pure White) with 70% to 85% alpha when combined with background blur.
  - Borders & Hairlines: `rgba(15, 23, 42, 0.06)` (1px physical stroke).
  - Primary Text: `#0F172A` (Slate 900)
  - Muted Text / Subtitles: `#64748B` (Slate 500)
- **Dark Mode Elevation Palette:**
  - Background Canvas: `#090D16` (Deep Midnight)
  - Translucent Shell / Surface: `rgba(15, 23, 42, 0.75)`
  - Elevated Popovers / Action Sheets: `#1E293B` (Slate 800)
  - Hairlines: `rgba(255, 255, 255, 0.12)`
  - Primary Text: `#F8FAFC`
  - Secondary Text: `#94A3B8`

### Brand Signature Gradient
- `gradient-smart-flow`: `linear-gradient(135deg, #0C59A4 0%, #1490DF 38%, #2CC4E3 72%, #4DDB8A 100%)`
- `gradient-mesh-card`: `radial-gradient(at 0% 0%, rgba(20, 144, 223, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(77, 219, 138, 0.15) 0px, transparent 50%)`

## Typography

Typography strictly embodies the proportional structure, metrics, and tight tracking of iOS 17 (modeled via Inter for universal browser support with SF Pro-grade metrics).

- **Hierarchy:** Prominent page headers utilize `headline-xl` (34px bold, tight tracking) mimicking the Apple collapsible navigation bar standard.
- **Numbers & Metrics:** Haitian Gourdes balances (`HTG 250`), signal strength (`-62 dBm`), and voucher PIN codes render with tabular figures (`font-feature-settings: "tnum" on, "cv05" on`) to eliminate jitter during active signal recalculations.
- **Micro-copy:** Network technical status (e.g., *“Borne SmartEco Delmas 33 • En ligne”*) renders in `body-sm` with slate-500 tinting for low cognitive clutter.

## Layout & Spacing

The layout is built mobile-first around standard iOS physical dimensions and dynamic viewport safe areas (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).

### Grid & Adaptation
- **Mobile PWA Container:** Max-width clamped at 430px for desktop preview or centered mobile tablet layouts, with outer content padding anchored at `margin` (16px / 1rem).
- **Safe Area Insets:** Top header clears `max(env(safe-area-inset-top), 20px) + 44px`. Bottom navigation bar pads `max(env(safe-area-inset-bottom), 16px) + 56px`.
- **Rhythm & Stacking:** Vertical stacks between section modules use `space-lg` (24px). Internal card padding uses `space-md` (16px) for compact data density or `space-lg` for prominent voucher tickets.

## Elevation & Depth

Visual hierarchy leverages iOS 17 acrylic materials rather than heavy drop shadows, balancing ambient illumination with light diffusion.

### Material Tiers
1. **Level 0 (Background Canvas):** Solid base `#F8FAFC` (light) or `#090D16` (dark).
2. **Level 1 (Frosted Glass Containers / Cards):**
   - Light: `background: rgba(255, 255, 255, 0.78); backdrop-filter: blur(20px) saturate(180%);`
   - Dark: `background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(24px) saturate(190%);`
   - Border: 1px continuous hairline `rgba(0, 0, 0, 0.05)` (light) / `rgba(255, 255, 255, 0.12)` (dark).
   - Shadow: `0 8px 32px -4px rgba(12, 89, 164, 0.08), 0 2px 8px -2px rgba(15, 23, 42, 0.04)`.
3. **Level 2 (Floating Action Panels & Modals):**
   - Translucent surface backed with `backdrop-filter: blur(30px)`.
   - Shadow: `0 20px 48px -8px rgba(12, 89, 164, 0.16)`.
4. **Level 3 (Sticky Floating Island Bar):**
   - Pinned navigation capsule floating 12px above bottom screen margin.
   - Tinted border with top edge highlighted: `inset 0 1px 0 0 rgba(255, 255, 255, 0.4)`.

## Shapes

The interface embraces continuous squircle and pill geometry typical of modern iOS interfaces.

- **Pill Elements (Radius 9999px / 28px):** Primary CTAs, active connection badges, dynamic island status alerts, and payment method chips.
- **Card Containers (Radius 22px to 26px):** Voucher tickets, bandwidth meters, and network selector containers.
- **Action Sheets & Sheet Drawers:** Top corner radii clamped at 32px with an Apple-standard gray grab-handle pill (36px × 5px).
- **Voucher Ticket Cutouts:** Inset radial semicircles (12px radius) on horizontal card flanks, joined across by a 1px dashed guide line (`rgba(15, 23, 42, 0.15)`).

## Components

### Buttons & Action Bars
- **Primary Pill CTA:**
  - Gradient background: `linear-gradient(135deg, #1490DF 0%, #2CC4E3 60%, #4DDB8A 100%)`.
  - Height: 52px (ideal thumb target). Radius: 9999px.
  - Text: `label-lg` in pure white with subtle text-shadow `0 1px 2px rgba(12, 89, 164, 0.3)`.
  - Active press state: transforms `scale(0.97)` with `opacity: 0.9`.
- **Secondary Glass Pill:**
  - Frosted white/slate background with hairline stroke.
  - Text: `#0C59A4` (Light) or `#2CC4E3` (Dark).

### Ticket & Voucher Cards (Bons WiFi)
- **Geometry:** Two-part ticket. Top segment contains plan validity (e.g., *“Illimité 24 Heures”*), throughput speed (up to *“10 Mbps”*), and price in Haitian Gourdes (`250 HTG`).
- **Divider:** Semicircular cutouts on both left and right edges connected via a horizontal dashed hairline separator (`border-top: 2px dashed rgba(100, 116, 139, 0.25)`).
- **Lower Segment:** One-touch copyable PIN code field or auto-login credentials, plus immediate payment button integration.

### Mobile Payment Selectors (Haitian Context)
- Horizontal carousel or segmented pills featuring:
  - **MonCash** (Digicel Red brand dot)
  - **Natcash** (Natcom Orange/Blue brand dot)
  - **Kobara** (Digital Wallet / Card)
- Selected state activates a 2px inner Azure Blue border (`#1490DF`) with a soft mint status check icon.

### Network Health & Telemetry Indicators
- **UniFi/MikroTik-grade diagnostics:** Compact horizontal status card displaying:
  - **Signal:** 4-bar dynamic signal icon colored dynamically (Green for `> -65 dBm`, Amber for `-66 to -78 dBm`, Red for `< -79 dBm`).
  - **Latence / Ping:** Numerical badge with micro-dot (`24 ms`).
  - **Borne Active:** Identifier pill (e.g., `AP-Pétion-Ville-04`).

### Inputs & PIN Keypad
- Rounded input fields (16px radius) with soft background fills (`rgba(15, 23, 42, 0.04)`), active blue border highlight, and clear button ("X" circle).
- Large 6-digit verification code cells with instant auto-focus for SMS OTP login.