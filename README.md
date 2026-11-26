# Glass Calendar

A spring-animated, frosted-glass calendar for macOS, built with React, TypeScript, Tailwind CSS, Framer Motion and Lucide icons, and wrapped as a native Mac app with Electron. The design takes its cues from the macOS calendar look (translucent sidebar, hairline borders, system font, tactile springs) but uses no Apple assets.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev        # opens the desktop app with hot reload
npm run dev:web    # or just the web version at http://localhost:5173
```

## Build the Mac app

```bash
npm run dist       # writes Glass Calendar .dmg and .zip files to release/
```

The build isn't signed with an Apple Developer ID, so the first time you open it, right-click the app in Finder and choose **Open** (or allow it in System Settings → Privacy & Security).

Every push and pull request also builds the `.dmg` on GitHub Actions (`Build macOS app` workflow); download it from the run's **Artifacts** section.

## What's inside

- **Views:** Day, Week (default), Month and Year, with a sliding segmented control. Switching views zooms between layers; moving forward or back in time slides in that direction.
- **Sidebar:** collapsible frosted drawer with a mini month (spring-animated selection pill, red for today) and calendar filters (Work, Personal, Family, Holidays, Travel) whose animated checkmarks fade events in and out.
- **Week/Day grid:** sticky frosted day headers, a live red current-time line, and an all-day lane that collapses when it gets crowded.
- **Create:** drag across time slots for an elastic ghost event that snaps to 15 minutes with a live time readout, or double-click for a one-hour event. Releasing opens an anchored glass popover.
- **Edit:** click an event to edit title, location, calendar (animated colour dots), all-day, dates and times, and notes, or delete it.
- **Move & resize:** drag events to another day or time, or drag the bottom edge to change the duration. Events lift with a shadow while dragging and spring into place. In Month view you can drag events between days.
- **Search:** expanding search field with live results; pick one to jump to it.
- **Light/Dark mode** toggle (the Mac window's vibrancy follows it).
- Events are saved locally, and the app starts with sample events around the current week.

## Shortcuts

| Action | Key |
| --- | --- |
| Today | `T` or `⌘T` |
| Previous / next | `←` `→` or `⌘←` `⌘→` |
| Day / Week / Month / Year | `D` `W` `M` `Y` or `⌘1`–`⌘4` |
| New event | `⌘N` |
| Search | `/` or `⌘F` |
| Toggle sidebar | `⌘⌥S` |
| Toggle dark mode | `⌘⇧D` |
| Close popover | `Esc` |
| Delete selected event | `Delete` (while its popover is open) |

## Project layout

```
electron/          main process (window, vibrancy, menus) and preload bridge
src/App.tsx        app state, navigation, view transitions
src/components/    Sidebar, MiniMonth, Toolbar, Search, TimeGrid, MonthView, YearView, EventPopover
src/lib/           dates, calendars and colours, motion constants, sample data
build/icon.png     app icon
```
