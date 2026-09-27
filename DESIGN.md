# Design guide

How styling works in this project, and where to change what.

- [The three layers](#the-three-layers)
- [Layer 1: the theme (globals.css)](#layer-1-the-theme-globalscss)
- [Layer 2: the shell (layout.tsx)](#layer-2-the-shell-layouttsx)
- [Layer 3: the pages](#layer-3-the-pages)
- [Workflow](#workflow)
- [Common recipes](#common-recipes)
- [Class cheat sheet](#class-cheat-sheet)
- [Known issues to fix](#known-issues-to-fix)
- [Gotchas](#gotchas)

---

## The three layers

| Layer | File | Changes affect |
|---|---|---|
| Theme | [src/app/globals.css](src/app/globals.css) | Every page — colors, fonts, shared styles |
| Shell | [src/app/layout.tsx](src/app/layout.tsx) | Every page — nav, footer, page wrapper, tab title |
| Page | [src/app/page.tsx](src/app/page.tsx), [src/app/login/](src/app/login/) | That one screen |

Ask "does this apply everywhere, or just here?" and the layer picks itself.

---

## Layer 1: the theme (globals.css)

**Tailwind 4 has no `tailwind.config.js`.** That file no longer exists. All customization happens in CSS inside the `@theme` block. Older tutorials that tell you to edit a JS config are written for Tailwind 3 and do not apply here.

Anything declared in `@theme` becomes a utility class automatically:

```css
@theme inline {
  --color-brand: #6366f1;
  --color-brand-dark: #4338ca;
}
```

That alone creates `bg-brand`, `text-brand`, `border-brand`, `ring-brand`, with editor autocomplete. Defining colors here once — rather than writing hex values across files — is what keeps the app looking like one thing.

Naming matters: the `--color-` prefix creates color utilities, `--font-` creates `font-*`, `--spacing-` creates spacing, `--radius-` creates `rounded-*`.

### Dark mode

Driven by the OS setting through `@media (prefers-color-scheme: dark)`. In markup, prefix any class with `dark:`:

```tsx
<div className="bg-white text-black dark:bg-black dark:text-zinc-50">
```

There is currently no in-app toggle — visitors get whatever their system is set to. Adding a toggle means switching to a `class`-based strategy on `<html>`; a bigger change, worth doing deliberately.

---

## Layer 2: the shell (layout.tsx)

Anything you put around `{children}` in [src/app/layout.tsx](src/app/layout.tsx) appears on every page. This is the home for a header, nav, footer, or a shared max-width container.

```tsx
<body className="min-h-full flex flex-col">
  <header className="border-b px-6 py-4">Albireo</header>
  <main className="flex flex-1 flex-col">{children}</main>
  <footer className="px-6 py-4 text-sm text-zinc-500">© 2026</footer>
</body>
```

The `metadata` export on line 16 sets the browser tab title. It still says "Create Next App".

Fonts are loaded here with `next/font` and exposed as CSS variables (`--font-geist-sans`), which `globals.css` maps into the theme. To swap fonts, change the import here and the mapping there.

---

## Layer 3: the pages

| File | What it is |
|---|---|
| [src/app/page.tsx](src/app/page.tsx) | Home page. Still the untouched Next.js template — safe to delete the contents entirely and start over. |
| [src/app/login/page.tsx](src/app/login/page.tsx) | Login screen layout, heading, and the "already signed in" state. |
| [src/app/login/login-form.tsx](src/app/login/login-form.tsx) | The form itself: inputs, error message, submit button. |

Styling is just the `className` strings. There is no separate stylesheet per page.

A new page is a new folder with a `page.tsx`: `src/app/about/page.tsx` serves `/about`. The folder name is the URL.

---

## Workflow

1. `npm run dev`
2. Open http://localhost:3000 beside your editor
3. Change a class, save, watch it update

Edits hot-reload without clearing what you've typed into a form, so you can restyle the login inputs while they still hold text.

Two exceptions that need a **full restart**: changes to [.env.local](.env.local) and to [next.config.ts](next.config.ts).

---

## Common recipes

**Change the accent color everywhere** — add `--color-brand` to `@theme` in [globals.css](src/app/globals.css), then use `bg-brand` instead of `bg-zinc-900` in the button.

**Make corners square** — replace `rounded-lg` / `rounded-full` with `rounded-none`.

**Wider login card** — in [login/page.tsx](src/app/login/page.tsx), change `max-w-sm` to `max-w-md`.

**Taller inputs** — in [login-form.tsx](src/app/login/login-form.tsx), add `h-12` to the input classes.

**More breathing room** — adjust `gap-4` on the form, or `py-16` on the page wrapper.

**Center something vertically** — `flex items-center justify-center` on the parent, which is what the login page already does.

---

## Class cheat sheet

The ones you'll reach for constantly:

| Purpose | Classes |
|---|---|
| Layout direction | `flex`, `flex-col`, `grid` |
| Alignment | `items-center`, `justify-center`, `justify-between` |
| Gaps between children | `gap-2` … `gap-8` |
| Inner padding | `p-4`, `px-6`, `py-3` |
| Outer spacing | `m-4`, `mb-6`, `mt-2` |
| Width limits | `w-full`, `max-w-sm`, `max-w-3xl` |
| Text size | `text-sm`, `text-lg`, `text-2xl` |
| Text weight | `font-medium`, `font-semibold` |
| Color | `text-zinc-600`, `bg-white`, `border-zinc-300` |
| Corners | `rounded-lg`, `rounded-full` |
| Phone vs desktop | `sm:`, `md:`, `lg:` prefixes |
| Dark mode | `dark:` prefix |
| Hover / disabled | `hover:`, `disabled:` prefixes |

Numbers are a scale, not pixels: `gap-4` is 1rem (16px), `gap-2` is 8px. Sticking to the scale is what makes spacing look intentional.

Breakpoint prefixes are **mobile-first**: `text-sm sm:text-lg` means small by default, larger on wider screens.

---

## Known issues to fix

**Body font is wrong.** [globals.css](src/app/globals.css) line 25 sets `font-family: Arial, Helvetica, sans-serif` on `body`, overriding the Geist fonts that [layout.tsx](src/app/layout.tsx) downloads. Change it to `var(--font-geist-sans)`.

**Tab title is the default.** `metadata` in [layout.tsx](src/app/layout.tsx) still reads "Create Next App".

**Duplicated input styling.** Both inputs in [login-form.tsx](src/app/login/login-form.tsx) carry the same long class string. Restyling means editing it twice, and the two will drift apart. Either extract a `<Field>` component — which lets the label and error travel with it — or define the style once in CSS:

```css
.input {
  @apply rounded-lg border border-zinc-300 px-3 py-2 outline-none;
}
```

The component is the better option.

---

## Gotchas

**Conditional classes don't merge.** `className={isActive ? "bg-blue-500" : "bg-zinc-200"}` is fine, but writing both `bg-blue-500` and `bg-zinc-200` in one string gives you whichever CSS rule wins, not the one you meant. Pick one per element.

**Dynamic class names are invisible to Tailwind.** `` className={`text-${color}-500`} `` produces no CSS, because Tailwind scans source text and never sees the assembled string. Write the full class names out and switch between them.

**`dark:` needs a light value too.** `dark:bg-black` with no base background inherits whatever is behind it. Always set both.

**Client vs server components.** [login-form.tsx](src/app/login/login-form.tsx) starts with `"use client"` because it uses React state. Pages without that line run on the server and cannot use `useState`, `onClick`, or browser APIs. Styling works identically in both — this only matters when you add interactivity.
