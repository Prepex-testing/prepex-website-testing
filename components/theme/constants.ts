export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "prepex-theme";
/** "lite" | "full" | absent (auto: lite on phones with 4 GB or less, or 4 cores or fewer). P6. */
export const MOTION_STORAGE_KEY = "prepex-motion";

// Executed as a raw string via a synchronous <script> in the <head>, before
// hydration, so the correct data-theme is painted on first frame. Keep this
// logic in sync with ThemeProvider's lazy initializer below.
export const NO_FLASH_THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem("${THEME_STORAGE_KEY}");
var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.setAttribute("data-theme",d?"dark":"light");
}catch(e){}
try{var m=localStorage.getItem("${MOTION_STORAGE_KEY}");var n=navigator;
var lite=m==="lite"||(m!=="full"&&((n.deviceMemory&&n.deviceMemory<=4)||(n.hardwareConcurrency&&n.hardwareConcurrency<=4)));
document.documentElement.setAttribute("data-motion",matchMedia("(prefers-reduced-motion: reduce)").matches?"reduce":lite?"lite":"full");
}catch(e){}})()`;
