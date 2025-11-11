# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **TechAuth** - a static HTML/CSS authentication template collection built with Tailwind CSS v3. It's a downloaded website copy (via HTTrack) containing authentication UI pages for sign-in, sign-up, and password recovery.

## Project Structure

```
techzaa.in/techauth/
├── signin-1.html              # Simple sign-in form with left sidebar
├── signin-2.html              # Sign-in form with social auth icons
├── signup-1.html              # Sign-up form with skills selector
├── signup-2.html              # Sign-up form with centered social icons
├── forgot-password-1.html     # Password reset (simple layout)
├── forgot-password-2.html     # Password reset (with social icons)
├── index04b9.html             # Demo gallery/landing page
└── assets/
    ├── css/
    │   ├── style.css          # Full Tailwind CSS compiled stylesheet
    │   └── style.min.css      # Minified version
    └── images/
        ├── bg.png             # Background image for variant 1 pages
        ├── bg-2.png           # Background image for variant 2 pages
        ├── logo.png           # TechAuth logo
        ├── user.png           # Testimonial user avatar
        └── demo/              # Screenshot thumbnails for demo page
```

## Architecture

### Two Design Variants

The template includes two distinct authentication page styles:

**Variant 1** (`*-1.html` files):
- Left sidebar with promotional content and testimonial
- Simple form layout on the right
- Uses `bg.png` background image
- More spacious, content-focused design

**Variant 2** (`*-2.html` files):
- Centered social authentication buttons (Facebook, Google+, LinkedIn)
- Icon-enhanced input fields
- Uses `bg-2.png` background image
- More compact, modern design

### Styling System

- Built entirely with **Tailwind CSS 3.3.2** utility classes
- Custom font: Montserrat (imported from Google Fonts)
- Primary color: Sky blue (`sky-600`: `rgb(2 132 199)`)
- Responsive grid system using Tailwind breakpoints:
  - Mobile-first design
  - `lg:` breakpoint (1024px) - Shows sidebar
  - `xl:` breakpoint (1280px) - 5-column grid for wider layouts
  - `2xl:` breakpoint (1536px) - Maximum padding constraints

### Common Components

All pages share:
- Full-screen centered layout with background image
- White card container with subtle shadow
- Sky-600 branded sections
- Form inputs styled with Tailwind form plugin
- Rounded buttons with hover/focus transitions

## File References

- All pages reference Font Awesome 6.4.0 from CDN for icons
- CSS references use relative paths: `assets/css/style.min.css`
- Background images referenced via Tailwind arbitrary values: `bg-[url('../images/bg.png')]`
- All HTML files include HTTrack mirror comments showing download date

## Notes

- This is a **static template** - no backend functionality
- Forms have no validation or submission logic
- Social auth buttons are placeholder links (`href="#"`)
- All pages are standalone HTML files with no dependencies between them
- The codebase is a website mirror, not a development environment
