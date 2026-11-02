/**
 * P6 boot splash. Server-rendered into the HTML, so it paints before any JavaScript bundle loads: the pyramid's steps
 * rise one by one from the bottom, then the coral dot drops onto the top with a small spring. Cold start only: the
 * inline script removes it at once when this browser session has already booted. `dismissBootSplash` (client) fades it
 * out once the app is ready, never before 700 ms (no flicker); past 1.5 s the finished mark breathes until then.
 */
export const BOOTED_KEY = "prepex.booted";

// Never removes the element (React owns it): it hides it with an attribute, see dismissBootSplash.
const SCRIPT = `(function(){try{var e=document.getElementById("boot-splash");if(!e)return;if(sessionStorage.getItem("${BOOTED_KEY}")){e.setAttribute("data-gone","");return;}window.__prepexBootAt=Date.now();setTimeout(function(){e.setAttribute("data-gone","");},12000);}catch(err){var y=document.getElementById("boot-splash");if(y)y.setAttribute("data-gone","");}})()`;

export function BootSplash() {
  return (
    <>
      <div id="boot-splash" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 748.31 547.78">
          <g className="bs-mark">
            <polygon className="bs-step bs-step-1" points="748.31 547.78 0 547.78 14.39 435.54 733.92 435.54 748.31 547.78" fill="currentColor" />
            <polygon className="bs-step bs-step-2" points="636.07 402.61 112.25 402.61 122.32 290.36 625.99 290.36 636.07 402.61" fill="currentColor" />
            <polygon className="bs-step bs-step-3" points="523.82 257.43 224.49 257.43 230.25 145.18 518.06 145.18 523.82 257.43" fill="currentColor" />
            <circle className="bs-dot" cx="374.16" cy="56.12" r="56.12" fill="#FF7A59" />
          </g>
        </svg>
      </div>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SCRIPT }}
      />
    </>
  );
}
