import { SymbolMark } from "@/components/ui/LogoMarks";

/**
 * The few places that wait without a page behind them (the splash route, onboarding's chapter list). P6: no spinning
 * dots; the Prepex mark breathes instead (still for reduced or lite motion).
 */
export function LoadingIndicator({ size = 64 }: { size?: number }) {
  return (
    <div role="status" aria-label="Loading" className="text-ink" style={{ width: size, height: Math.round(size * 0.73) }}>
      <SymbolMark title="" className="logo-breathe h-full w-full" />
    </div>
  );
}
