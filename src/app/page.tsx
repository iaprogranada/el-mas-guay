import RankingApp from "@/components/RankingApp";
import { getSnapshot } from "@/lib/ranking";
import { EMPTY_SNAPSHOT, type Snapshot } from "@/lib/types";

// La portada se regenera como mucho cada 5 segundos; lo nuevo llega después por /api/live.
export const revalidate = 5;

async function load(): Promise<Snapshot> {
  try {
    return await getSnapshot(1);
  } catch (e) {
    // Sin base de datos (por ejemplo, en el primer despliegue) la página sale igual y el navegador lo reintenta.
    console.error("[portada] no se pudo cargar el ranking:", e);
    return { ...EMPTY_SNAPSHOT, now: new Date().toISOString() };
  }
}

export default async function Home() {
  return <RankingApp initial={await load()} />;
}
