import { useEffect } from 'react';
import { useAppState } from '../state/AppState.jsx';

// Renders admin-edited accent colors as CSS variable overrides so
// non-technical color changes (Admin → Settings) take effect instantly,
// with no code edits or rebuild required.
// The guest's party group sets the main accent on the document.
export default function ThemeStyleInjector() {
  const { content, guest } = useAppState();

  useEffect(() => {
    const root = document.documentElement;
    if (guest?.groupNumber) root.dataset.group = String(guest.groupNumber);
    else delete root.dataset.group;
    return () => {
      delete root.dataset.group;
    };
  }, [guest?.groupNumber]);
  const css = Object.entries(content.themeColors || {})
    .map(
      ([theme, { accent, ink }]) => `[data-theme='${theme}'] { --accent: ${accent}; --accent-ink: ${ink}; }`
    )
    .join('\n');
  return <style>{css}</style>;
}
