/**
 * Pexo's six forms (guide, section 10): the student's level band. Each form ADDS a layer to the ones below it, so an
 * IITian-in-making Pexo has the sprout, the lamp, glasses, a backpack, a cape and a plain hoodie (no institute name or
 * logo). Layers are split by depth: "behind" draws before the body, "front" after the face. Existing colour tokens only.
 */

export const PEXO_FORMS = ["aspirant", "grinder", "solver", "ranker", "topper", "iitian"] as const;
export type PexoForm = (typeof PEXO_FORMS)[number];

export const FORM_TITLES: Record<PexoForm, string> = { aspirant: "Aspirant", grinder: "Grinder", solver: "Solver", ranker: "Ranker", topper: "Topper", iitian: "IITian-in-making" };

const rank = (f: PexoForm) => PEXO_FORMS.indexOf(f);
/** Does this form include that layer (its own or one below it)? */
export const hasLayer = (form: PexoForm, layer: PexoForm) => rank(form) >= rank(layer);

export const isForm = (v: unknown): v is PexoForm => typeof v === "string" && (PEXO_FORMS as readonly string[]).includes(v);

/** Cape and hoodie hood: behind the body. */
export function FormBehind({ form, tiny }: { form: PexoForm; tiny: boolean }) {
  return (
    <>
      {hasLayer(form, "topper") && (
        <path data-form-layer="cape" d="M30 70 Q24 104 18 112 L102 112 Q96 104 90 70 Z" fill="var(--brand)" opacity={tiny ? 0.9 : 1} />
      )}
      {hasLayer(form, "iitian") && <path data-form-layer="hood" d="M18 66 Q18 18 60 18 Q102 18 102 66 Q96 30 60 30 Q24 30 18 66 Z" fill="var(--brand)" />}
      {hasLayer(form, "ranker") && !tiny && <rect data-form-layer="backpack" x={84} y={58} width={22} height={34} rx={7} fill="var(--saffron)" stroke="var(--brand)" strokeWidth={1.6} />}
    </>
  );
}

/** Sprout, glasses, backpack straps, hoodie strings, the idle lamp: in front. */
export function FormFront({ form, tiny, capOn, idle }: { form: PexoForm; tiny: boolean; capOn: boolean; idle: boolean }) {
  return (
    <>
      {/* the sprout sits on the head (under a cap it is hidden) */}
      {!capOn && (
        <g data-form-layer="sprout">
          <path d="M60 27 L60 17" stroke="var(--success)" strokeWidth={tiny ? 4 : 2.6} strokeLinecap="round" />
          <path d="M60 19 Q50 10 46 16 Q52 22 60 19 Z" fill="var(--success)" />
          {!tiny && <path d="M60 17 Q70 7 74 13 Q68 20 60 17 Z" fill="var(--success)" />}
        </g>
      )}
      {hasLayer(form, "solver") && (
        <g data-form-layer="glasses" fill="none" stroke="#1A1A2E" strokeWidth={tiny ? 3.4 : 2.2}>
          <circle cx={46} cy={58} r={13} />
          <circle cx={74} cy={58} r={13} />
          <path d="M59 57 Q60 55 61 57" />
        </g>
      )}
      {hasLayer(form, "ranker") && !tiny && (
        <g data-form-layer="straps" stroke="var(--saffron)" strokeWidth={3.2} strokeLinecap="round" fill="none">
          <path d="M84 40 Q92 60 88 92" />
        </g>
      )}
      {hasLayer(form, "iitian") && !tiny && (
        <g data-form-layer="strings" stroke="var(--brand)" strokeWidth={1.8} strokeLinecap="round">
          <path d="M52 92 L50 104" />
          <path d="M68 92 L70 104" />
        </g>
      )}
      {/* the Grinder's study lamp, carried when Pexo holds nothing else */}
      {hasLayer(form, "grinder") && idle && !tiny && (
        <g data-form-layer="lamp">
          <path d="M14 104 L14 88 L20 82" fill="none" stroke="var(--brand)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 76 L28 76 L30 84 L12 84 Z" fill="var(--saffron)" stroke="var(--brand)" strokeWidth={1.4} strokeLinejoin="round" />
        </g>
      )}
    </>
  );
}
