import { getState } from "@/lib/state";
import { FilmClient } from "./FilmClient";
export const dynamic = "force-dynamic";
/** Chrome-free full-screen spin for recording the launch clip. One full rotation every 5 seconds. */
export default async function Film() {
  const s = await getState();
  return <FilmClient slots={s.slots} />;
}
