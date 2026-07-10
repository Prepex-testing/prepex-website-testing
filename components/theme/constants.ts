export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "prepex-theme";

// Executed as a raw string via a synchronous <script> in the <head>, before
// hydration, so the correct data-theme is painted on first frame. Keep this
// logic in sync with ThemeProvider's lazy initializer below.
export const NO_FLASH_THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem("${THEME_STORAGE_KEY}");
var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.setAttribute("data-theme",d?"dark":"light");
}catch(e){}})()`;
