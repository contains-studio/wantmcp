---
name: experience-review
description: Review a Want MCP screen, flow, email or agent-facing text through the owner's seven questions, with real screenshots on a phone in dark mode. Use after building or changing any UI, before reporting a UI round or deploying it, and whenever asked to review, critique or audit the experience.
---

# Experience review: the owner's seven questions

The owner of The Want MCP judges every screen the same way. Builders used to check that pages load, tests pass
and contrast is fine, which left the judging to the owner. This skill is how to do that judging first.

Use it on anything a person or an agent meets: web pages, sign-in and consent pages, emails, the Claude widget,
MCP tool descriptions and result text.

## The seven questions

Ask each one of every screen, in every state. A screen passes only if all seven pass.

1. **Does it earn its place?** Every word, control, option and section does a job for the person looking at it
   now. Remove what is redundant, decorative, off-season, or there only because it was possible.
   Typical failures: labels that restate the obvious, captions that repeat the table under them, a second way to
   do the same thing, an option nobody chooses, disclaimers in the page body, decorative text.
2. **Is it in the right place?** Preferences live on the account page. Actions sit beside the thing they act on.
   One-time choices appear once, where they are made. Page chrome carries only navigation.
   Typical failures: a setting in the top bar, an action on its own row far from its subject, a sign-up choice
   repeated in settings.
3. **Does it use what it already knows?** Signed in means prefilled and selectable, never typed or pasted.
   Typical failures: a text box for the person's own list link, placeholders such as `YOUR_LIST` shown to someone
   who has lists, showing people their own handle, asking what the system can work out.
4. **Is the next step explicit?** Every screen ends in the next step of the loop, stated as an instruction:
   list what you want → give it to an agent → the agent works → you decide. For agents too.
   Typical failures: an empty page after creating something, a finished form with nowhere to go, a title that
   names the mechanism ("Sign in") instead of what the person is doing ("Start your list").
5. **Does the first screen sell the benefit, now?** Above the fold: the outcome and the timely hook. Supporting
   material is one line.
   Typical failures: logos, feature lists or chrome pushing the reason to care below the fold; evergreen copy
   when there is a season.
6. **Is it finished and friendly?** Nothing clipped, scrolling inside a frame, empty, harsh, heavy or
   unrecognisable. Real logos. US dollars and US wording. A calm tone. Light visual weight for secondary actions.
   Typical failures: text cut mid-word, inner scrollbars, a slab of empty background, dark-on-dark buttons,
   filled buttons for row actions, an icon a first-time visitor cannot name, a wrong or stale brand mark.
7. **Was it looked at the way the owner looks?** On a phone, in dark mode, with real content, signed in and
   signed out, first run and returning. Most failures are found there and nowhere else.

## How to review

1. **List the states.** For each screen: signed out; signed in with nothing (first run); signed in with real
   content (several lists, agent activity, an open question); an error or expired state. Long titles and many
   items where they can occur.
2. **Take real screenshots.** Phone width (390×844) in dark mode first, then desktop (1280×900) in light. Use
   `scripts/shots.mjs` in this skill folder (see below). Never judge from a builder's own screenshot or from a
   shrunken full-page image: cut tall pages into screen-height slices and read each one.
3. **Measure.** The script prints words and interactive controls per screen and the page height. A working page
   with hundreds of controls or thousands of words has failed question 1 before you look.
4. **Answer the seven questions in writing for each screen and state.** One line each: pass, or what fails and
   where. Quote the words on screen. Give pixels and counts.
5. **Propose the fix.** Specific enough to build without a meeting: what to remove, move, rename, merge or
   prefill. Prefer removing to adding. Do not propose a new feature unless a journey is blocked without one.
6. **Fix or send back before anyone shows it to the owner.** A round is not ready while any question fails on any
   changed screen. Say plainly what you did not look at.

## Output

- "The ones that matter most": at most ten, two or three lines each.
- Findings grouped by screen. Each: screen and state (URL pattern, viewport, mode, signed in or out), the
  question it fails, what was seen, the screenshot's absolute path, the proposed fix, size (S/M/L), who builds it.
- A cut list: everything to delete outright, one line each on why nobody would miss it.
- What is good: things that pass all seven and must survive the next change.
- Words and controls per screen, before and after when reviewing a change.

## Rules

- One problem per finding. No generic advice ("improve hierarchy"). No finding without evidence.
- Keep trust information: who posted a price, when it was checked, its source, the private marker. That is not
  filler.
- Accessibility is part of "finished": one clear heading per section, unique names for controls, 44px touch
  targets, visible focus, works without JavaScript, nothing conveyed by colour alone, reduced motion respected.
- A review reads and reports. It does not change code or deploy unless the task says so.
- Test data: use only a dedicated test account, create private lists unless a visitor view needs a public one,
  and delete everything created before finishing. Never sign up with or send email to a real address.

## The screenshot script

`scripts/shots.mjs` drives Chrome through Playwright, which must be resolvable from the working directory (run it
from a checkout of the web app's `apps/web` folder with dependencies installed; do not edit that checkout).

```
cd <web repo>/apps/web
node <this skill>/scripts/shots.mjs --base https://wantmcp.com --out <folder> \
  [--session <json file with a "token" field for the test account>] \
  /  /login  /connect  /app  /l/<id>  /app/lists/<id>/settings
```

For each path it writes `<name>-phone-dark.png` and `<name>-desktop-light.png` (full page), cuts the phone image
into screen-height slices (`<name>-phone-dark-1.png`, …), and prints words, controls and height. With `--session`
the pages are loaded signed in. It never prints the token.
