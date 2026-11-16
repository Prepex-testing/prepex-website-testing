import type { MetadataRoute } from "next";
import { IS_PRODUCTION_SITE } from "@/lib/seo";

/** Launch step 3: on app.prepex.io only the public pages are for search engines; testing is not indexed at all. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: IS_PRODUCTION_SITE ? [{ userAgent: "*", allow: ["/privacy", "/terms", "/contact"], disallow: ["/"] }] : [{ userAgent: "*", disallow: ["/"] }],
  };
}
