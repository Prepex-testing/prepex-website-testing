import { NO_FLASH_THEME_SCRIPT } from "@/components/theme/constants";

// React warns in dev when a Server Component renders a raw <script>. This
// wrapper sidesteps it exactly as documented in Next's own
// preventing-flash-before-hydration guide: text/javascript on the server so
// the browser executes it during HTML parsing, text/plain on the client so
// React doesn't re-render/re-warn on hydration.
export function InlineThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
    />
  );
}
