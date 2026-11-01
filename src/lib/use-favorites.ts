import { useEffect, useState } from "react";
import { getBrowserClient } from "./supabase/client";
export function useFavorites(userId: string | undefined, demo: boolean) {
  const [state, setState] = useState<{ user?: string; keys: string[] }>({
    keys: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const keys = state.user === userId ? state.keys : [];
  useEffect(() => {
    let active = true;
    setError(false);
    if (!userId) return;
    if (demo) {
      try {
        setState({
          user: userId,
          keys: JSON.parse(
            localStorage.getItem(`hawall-favorites:${userId}`) || "[]",
          ),
        });
      } catch {
        setState({ user: userId, keys: [] });
      }
      return;
    }
    getBrowserClient()
      ?.from("favorites")
      .select("record_table,record_id")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!active) return;
        setError(!!error);
        setState({
          user: userId,
          keys: (data ?? []).map((r) => `${r.record_table}:${r.record_id}`),
        });
      });
    return () => {
      active = false;
    };
  }, [userId, demo]);
  const has = (table: string, id: string) => keys.includes(`${table}:${id}`);
  async function toggle(table: string, id: string) {
    if (!userId || busy) return;
    setBusy(true);
    setError(false);
    const key = `${table}:${id}`,
      exists = keys.includes(key),
      next = exists ? keys.filter((k) => k !== key) : [...keys, key];
    try {
      if (demo)
        localStorage.setItem(
          `hawall-favorites:${userId}`,
          JSON.stringify(next),
        );
      else {
        const client = getBrowserClient();
        if (!client) throw Error();
        const result = exists
          ? await client
              .from("favorites")
              .delete()
              .eq("user_id", userId)
              .eq("record_table", table)
              .eq("record_id", id)
          : await client
              .from("favorites")
              .insert({ user_id: userId, record_table: table, record_id: id });
        if (result.error) throw result.error;
      }
      setState({ user: userId, keys: next });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return { has, toggle, busy: busy || state.user !== userId, error };
}
