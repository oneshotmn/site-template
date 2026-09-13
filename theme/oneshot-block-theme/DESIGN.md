---
version: alpha
name: Default
description: Neutral, deliberately plain starting theme. What a freshly scaffolded OneShot site wears before any brand work is done.
colors:
  surface: "#f4f5f7"
  surface-raised: "#ffffff"
  surface-inverse: "#111214"
  surface-inverse-raised: "#292a2c"
  surface-inverse-well: "#0e0f11"
  text: "#111214"
  text-body: "#23262b"
  text-muted: "#5b5e66"
  text-on-inverse: "#ffffff"
  text-on-inverse-muted: "#b7bac0"
  primary: "#2f5fdb"
  primary-on-inverse: "#8fb0ff"
  accent: "#0f7a6b"
  accent-tint: "#e3f3f0"
  primary-tint: "#e4e9fa"
  line: "#d0d3d8"
  line-soft: "#e3e5e9"
  error: "#d64545"
  error-text: "#b23232"
  error-surface: "#fbeaea"
  disabled: "#e2e4e8"
  disabled-text: "#4d5058"
  surface-dark: "#111214"
  surface-raised-dark: "#222324"
  surface-inverse-dark: "#f4f5f7"
  surface-inverse-raised-dark: "#ffffff"
  surface-inverse-well-dark: "#e8e9eb"
  text-dark: "#f4f5f7"
  text-body-dark: "#e7e8ea"
  text-muted-dark: "#b7bac0"
  text-on-inverse-dark: "#111214"
  text-on-inverse-muted-dark: "#5b5e66"
  primary-dark: "#b6c7f2"
  primary-on-inverse-dark: "#2f5fdb"
  accent-dark: "#5fd6c0"
  accent-tint-dark: "#112524"
  primary-tint-dark: "#22283a"
  line-dark: "#4a4b4c"
  line-soft-dark: "#323335"
  error-dark: "#ff8080"
  error-text-dark: "#e8c2c2"
  error-surface-dark: "#3a1f1f"
  disabled-dark: "#3a3b3e"
  disabled-text-dark: "#c7c9cd"
typography:
  h1:
    fontFamily: system-ui
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  h2:
    fontFamily: system-ui
    fontSize: 2rem
    fontWeight: 600
    lineHeight: 1.2
  body-md:
    fontFamily: system-ui
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: system-ui
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: ui-monospace
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.text}"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
---

## Overview

Default is the theme every freshly scaffolded OneShot site wears before any
design work has happened. It is deliberately plain: a single neutral grey
scale, one workable blue accent, and a green secondary accent, so a template
renders as a legible, presentable site with zero brand decisions made yet.
Nothing here is meant to survive contact with a real brand review — it
exists to make the unstyled state of a new site look intentional rather than
broken, and to give the contract test something concrete to check against.

## Colors

- **Surface (`#f4f5f7`):** a soft off-white page background — bright enough
  to read as "unfinished but clean," not stark white.
- **Primary (`#2f5fdb`):** the one interactive blue. Every link, active nav
  item, and primary CTA uses it and nothing else.
- **Accent (`#0f7a6b`):** a secondary green for chips, numerals, and
  decorative fills — never the sole carrier of an interactive affordance.
- **Error (`#d64545` / `#b23232` text):** kept a clear, unambiguous red so
  invalid states never get confused with the primary accent.
- **Primary tint (`#e4e9fa`):** a pale wash of the primary blue for card
  grounds and chips that need to read as "carrying the primary" without
  using the accent hue.
- **Disabled (`#e2e4e8` fill / `#4d5058` text):** a flattened neutral so a
  disabled control still reads as present and legible, never invisible.
- Every role above also has a `-dark` counterpart (see `CONTRACT.md`) for a
  dark-mode context with no light-scheme values reused.

## Typography

System-ui end to end. A default theme doesn't get to make a font choice; it
inherits whatever fonts the visiting platform already has, which keeps this
theme render-ready with zero network requests and zero flash of unstyled
text before a brand theme replaces it.

## Layout

Spacing follows a plain 4px-rooted scale (`4/8/16/24/32/48`). Radii are a
short 4/8/16px ladder plus a `pill` value for fully-rounded controls —
nothing exotic, so components built against Default don't accidentally bake
in a brand-specific geometry assumption.

## Components

`button-primary` is the only high-emphasis action a page shows at once — its
fill is `primary`, never `accent`. `card` uses `surface-raised` so cards
read as a level above the page without introducing a second colour.

## Do's and Don'ts

- **Do** treat every colour here as a placeholder a real brand review will
  replace wholesale — do not hand-tune Default's hex values because they
  "look a bit better"; that defeats the point of a neutral baseline.
- **Do** reference roles (`primary`, `surface-raised`) from components, never
  the literal hex values in this file.
- **Don't** add hue-named tokens (`--blue`, `--teal`) anywhere downstream —
  the whole contract exists so that never has to happen again.
- **Don't** ship a component that only defines light-mode styling; every
  role listed here has a `-dark` sibling specifically so dark mode is free.
