---
name: Field Scanner Aesthetic
colors:
  surface: '#f8faf9'
  surface-dim: '#d8dad9'
  surface-bright: '#f8faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f3'
  surface-container: '#eceeed'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#3f4941'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#eff1f0'
  outline: '#6f7a71'
  outline-variant: '#bec9bf'
  surface-tint: '#066c41'
  primary: '#006038'
  on-primary: '#ffffff'
  primary-container: '#1f7a4d'
  on-primary-container: '#aeffca'
  inverse-primary: '#82d8a3'
  secondary: '#3d6751'
  on-secondary: '#ffffff'
  secondary-container: '#bceacf'
  on-secondary-container: '#416b55'
  tertiary: '#804300'
  on-tertiary: '#ffffff'
  tertiary-container: '#a45800'
  on-tertiary-container: '#ffe9db'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ef5be'
  primary-fixed-dim: '#82d8a3'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#00522f'
  secondary-fixed: '#bfedd2'
  secondary-fixed-dim: '#a3d1b6'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#254f3a'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8faf9'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
typography:
  headline-xl:
    fontFamily: Nunito Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Nunito Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  matrix-cell:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-sm: 0.5rem
  margin: 1rem
  margin-sm: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system is structured for mission-critical fieldwork, optical capture, and forestry inventory management. It bridges high-trust institutional forestry documentation with an intuitive, field-ready tactile scanner tool. The aesthetic balances soft ambient surfaces with technical precision, ensuring field rangers and biometric technicians experience zero visual fatigue under bright natural sunlight.

### Tone & Character
- **Reliable & Utilitarian**: Clear feedback, tactile interactions, and unyielding data clarity across appraisal workflows.
- **Organic Precision**: Deep vegetative undertones paired with crisp technical data matrices.
- **Physicality**: Tactile buttons, optical scanner framing, and subtle inner edge-lighting that emulates modern handheld optical field hardware.

### Design Movement
Tactile Technical Utility: Crisp modern mobile ergonomics balanced with subtle skeuomorphic cues (calibrated glows, optical lenses, mechanical switch states, and surface-stamped data grids).

## Colors

The palette draws strictly from deep forest reserves, optical laser hints, and technical paper forms. Pure blues are completely excluded from the system to preserve dedicated environmental recognition.

### Color Roles & Meaning
- **Primary (`#1F7A4D`)**: Core actions, lens reticles, scan triggers, and verified appraisal points.
- **Deep Canopy (`#133E2B`)**: High-contrast active states, floating button shadows, and structural framing.
- **Tinted Canopy (`#DDF1E6`)**: Active row selections, chip backdrops, and lens capture targets.
- **Amber Indicator (`#D97706` / Surface `#FEF3C7`)**: OCR inspection required; flags cell confidence under 85%.
- **Emerald Validated (`#059669` / Surface `#D1FAE5`)**: Mathematically checked and validated stumpage entries.
- **Destructive Red (`#DC2626`)**: Strictly reserved for sheet deletion, scan discarded, and irreversible cell wipes.
- **Canvas Base (`#F3F5F4`)**: Soft tinted off-white that reduces glare outdoors compared to pure `#FFFFFF`.
- **Primary Ink (`#0F172A`)**: High-legibility slate for all structural headings and critical data values.
- **Secondary Ink (`#64748B`)**: Field coordinates, form line numbers, and deactivated system meta.

## Typography

Typography establishes an intentional operational hierarchy: human-centered, readable titles contrasted against rigid, monospace matrix readouts.

- **Nunito Sans**: Used exclusively for top navigation titles, sheet names, modal headlines, and high-level card headers. Its rounded terminal geometry softens administrative weight without sacrificing readability.
- **JetBrains Mono**: Used for all numerical values, form codes (e.g., AGW-85-01), batch identifiers, and the 10x19 stumpage appraisal grid. All numerals are rendered with monospaced tabular alignment to allow rapid vertical scanning across columns without misaligned decimals.

## Layout & Spacing

The layout is built upon an 8px base rhythm (`0.5rem` = 8px) optimized for handheld field scanning with one-handed interaction zones.

### Matrix View Layout (10x19 Grid)
- **Cell Container**: Fixed 44px minimum touch targets with horizontal scroll lock and sticky row/column headers.
- **Edge Gaps**: 8px inner cell gaps to prevent erroneous adjacent taps when wearing field gear.

### Adaptation
- **Mobile (Base)**: Single-column workflow card view. Bottom navigation anchors the primary scan trigger within reach of the thumb.
- **Tablet / Large Display**: Dual-pane mode. The raw optical document preview occupies the left half, and the extracted interactive 10x19 matrix occupies the right half for side-by-side reconciliation.

## Elevation & Depth

Visual hierarchy combines physical edge-highlights with diffused forest-tinted shadows to replicate backlit hardware panels.

### Surface Tiers
- **Canvas Base (`#F3F5F4`)**: Level 0 background layer.
- **Data Cards (`#FFFFFF`)**: Level 1 elevated surfaces. Rendered with a compound shadow: `0 6px 18px -8px rgba(19, 62, 43, 0.18)` and an inner top specular line `inset 0 1px 0 rgba(255, 255, 255, 0.9)`.
- **Floating Modals & Sheets**: Level 2 high surfaces. Elevated via `0 12px 32px -4px rgba(19, 62, 43, 0.22)`.
- **Tactile Button Press**: Depressed elements transition from elevated shadows to a flat 1px border and a subtle internal dark gradient, providing immediate tactile response.

## Shapes

The shape vocabulary uses calculated corner geometry that balances industrial durability with interface softness.

- **Data Cards & Tiles**: Exactly `16px` (`rounded-lg`) corner radii to form smooth physical cards.
- **Interactive Action Buttons**: `14px` corner radii to distinguish clickable targets from card containers.
- **Audit Chips & Badges**: Fully pill-shaped (`9999px`) to frame numerical indicators cleanly.
- **Bottom Inspection Sheets**: `28px` top-left and top-right radii; flat lower edges flush with the mobile screen.
- **Matrix Cells**: Subtle `4px` inner corner rounding, producing discrete, readable grid boxes.

## Components

### Global Navigation Bars
- **Top Bar**: Minimalist `#F3F5F4` base with integrated hardware status. Centered Nunito Bold title (`KFS Scan` or context name) flanked by an organic sync LED pill (`#059669` for Cloud Sync Ready; pulsing `#D97706` for Offline Queue). Left action accommodates standard navigation/menu; right action houses OCR search.
- **Bottom Navigation Dock**: Floating pure `#FFFFFF` bar with rounded corners (`24px`), containing Archive (left) and Settings/Keys (right). The center features an elevated circular Primary Scan Trigger (56px) with an ambient `#1F7A4D` glow and a surrounding pale halo ring (`#DDF1E6`).

### Primary Action Buttons
- **Style**: Soft vertical gradient from `#2D8F5E` (top) to `#1F6B43` (bottom).
- **Edges**: 1px crisp top inner highlight `inset 0 1px 0 rgba(255, 255, 255, 0.35)`.
- **Shadow**: `0 8px 20px -4px rgba(31, 122, 77, 0.42)`.
- **Typography**: Nunito Bold or JetBrains Mono Medium (all-caps tracking +0.05em for system instructions).

### Appraisal Form Matrix (10x19 Grid)
- **Cell Structure**: 44px min-height cells on a `#FFFFFF` substrate.
- **Low Confidence State (<85%)**: Bordered with `#D97706`, filled with `#FEF3C7`, and displaying an amber warning dot in the top-right corner.
- **Confirmed State**: Bordered with transparent light grey, switching to `#D1FAE5` border on active touch.
- **Selected Cell**: Ringed by a 2px `#1F7A4D` halo with an elevated mini magnifier tooltip above the finger anchor.

### Status Badges & Chips
- **Confidence Badges**: Pill-shaped components rendering accuracy percentages in `JetBrains Mono 11px`.
- **Format**: 4px vertical padding, 10px horizontal padding. Verified displays `#059669` text over `#D1FAE5`; review displays `#D97706` text over `#FEF3C7`.

### Inputs & Inspection Fields
- **Background**: Pure `#FFFFFF` with a 1px solid border in `#E2E8F0`.
- **Active / Focus**: Switched to a 1.5px `#1F7A4D` outline with an inner 2px tint wash (`#DDF1E6`).
- **Data Readout**: Numerical fields strictly force tabular figures with an optional physical unit label (`m³`, `cm`, `No.`) anchored to the right edge.