import type { Metadata } from "next";
import { RulesContent, TermsContent } from "@/components/Legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Términos de uso · ${SITE.name}`,
  description: "Normas, pago, privacidad y aviso legal de El Más Guay del Mundo.",
  alternates: { canonical: "/terminos" },
};

export default function Terminos() {
  return (
    <main className="legalpage">
      <a className="backhome" href="/">
        ← Volver al ranking
      </a>
      <div className="dlg terms rim">
        <h1>Términos de uso</h1>
        <TermsContent />
        <h4>Normas, explicadas</h4>
        <RulesContent />
      </div>
    </main>
  );
}
