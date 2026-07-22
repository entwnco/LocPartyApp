import { useAppState } from '../state/AppState.jsx';

// Renders admin-edited accent colors as CSS variable overrides so
// non-technical color changes (Admin → Settings) take effect instantly,
// with no code edits or rebuild required.
export default function ThemeStyleInjector() {
  const { content } = useAppState();
  const css = Object.entries(content.themeColors || {})
    .map(
      ([theme, { accent, ink }]) => `[data-theme='${theme}'] { --accent: ${accent}; --accent-ink: ${ink}; }`
    )
    .join('\n');
  return <style>{css}</style>;
}
