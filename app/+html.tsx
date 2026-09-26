import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The HTML document every web route is rendered into.
 *
 * This file is read only by the web bundler, so nothing in it can reach the
 * iOS or Android build — it is the one place where writing plain CSS is the
 * right answer rather than a leak of web assumptions into shared code.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Matches the dark default so the browser chrome does not flash white
            on mobile Safari and Chrome before the app paints. */}
        <meta name="theme-color" content="#0B0B0C" />

        {/* Required by react-native-web: without it the document scrolls as
            well as the <ScrollView>s inside it, giving two nested scrollbars. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: documentStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * The app resolves its own theme from storage a moment after boot. Until then
 * the document is whatever the browser defaults to — white — so the first
 * paint of a dark app is a flash of white. Painting the root the dark
 * background up front removes it, and the `prefers-color-scheme` block keeps
 * a light-mode visitor from getting the opposite flash.
 *
 * `cursor` is the other half: react-native-web leaves <Pressable> as a plain
 * div, which on a desktop browser gives no indication anything is clickable.
 */
const documentStyles = `
html, body, #root {
  background-color: #0B0B0C;
}

@media (prefers-color-scheme: light) {
  html, body, #root {
    background-color: #F5F5F2;
  }
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior-y: none;
}

[role="button"]:not([aria-disabled="true"]),
[role="tab"]:not([aria-disabled="true"]),
[role="link"] {
  cursor: pointer;
}

[role="button"][aria-disabled="true"] {
  cursor: default;
}

/* A focus ring belongs on keyboard navigation, not on every mouse click —
   without this, tapping a card on web leaves a box drawn around it. */
:focus:not(:focus-visible) {
  outline: none;
}

/* Scoped to the things react-native-web renders as bare divs, which would
   otherwise be unreachable by keyboard with nothing to show for it. Text
   inputs are deliberately excluded: <TextField> draws its own focus border on
   the rounded wrapper, and an outline on the inner <input> lands inset inside
   that wrapper as a square overlapping the corners. */
[role="button"]:focus-visible,
[role="tab"]:focus-visible,
[role="link"]:focus-visible,
a:focus-visible {
  outline: 2px solid #2DC8EB;
  outline-offset: 2px;
}

input:focus,
textarea:focus {
  outline: none;
}

input, textarea {
  /* Safari refuses to inherit the app's font into form controls otherwise. */
  font-family: inherit;
}
`;
