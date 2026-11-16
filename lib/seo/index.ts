/**
 * Launch step 3: only the production site (app.prepex.io) lets search engines index its public pages (privacy, terms,
 * contact). Testing/staging and every signed-in screen stay noindex.
 */
export const IS_PRODUCTION_SITE = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "") === "https://app.prepex.io";

export const publicPageRobots = () => (IS_PRODUCTION_SITE ? { index: true, follow: true } : { index: false, follow: false });
