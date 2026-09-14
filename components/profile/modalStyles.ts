/**
 * Shared type scale for the profile modals (Edit Profile, Study Preferences),
 * so both read as one system instead of drifting apart.
 */

/** Modal title — bold 18/28 from sm up, 16/24 on phones. */
export const MODAL_TITLE =
  "font-sans text-base font-bold leading-6 tracking-normal align-middle text-ink sm:text-lg sm:leading-7";

/** Close (X) icon — 14×14 from sm up, 12×12 on phones. */
export const MODAL_CLOSE_ICON = "h-3 w-3 sm:h-3.5 sm:w-3.5";

/** Field labels — bold 14/20 from sm up, 13px on phones. */
export const FIELD_LABEL =
  "font-sans text-[13px] font-bold leading-5 tracking-normal align-middle text-[#1A1D4D] dark:text-(--text-primary,#FAF7F2) sm:text-sm";

/** Cancel / Save — 54px tall, 12px radius, 1px border, bold 16/24 text from
 *  sm up; a step smaller on phones. `!` because Button concatenates classes,
 *  so a plain h-/rounded-/border wouldn't reliably beat its size defaults. */
export const FOOTER_BUTTON =
  "flex-1 h-12! rounded-xl! border! py-3! text-sm! font-bold! leading-5 tracking-normal text-center align-middle sm:h-13.5! sm:py-3.5! sm:text-base! sm:leading-6";
