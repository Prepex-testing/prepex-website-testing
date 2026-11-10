import { notFound } from "next/navigation";
import { PexoLab } from "@/components/pexo/PexoLab";

/** Every Pexo mood, size, prop and accessory on one page, for visual checks. Development builds only. */
export default function PexoLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PexoLab />;
}
