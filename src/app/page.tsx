import { Board } from "@/components/Board";
import { getState } from "@/lib/state";
export const dynamic = "force-dynamic";
export default async function Home() {
  const state = await getState();
  return <Board initial={state} />;
}
