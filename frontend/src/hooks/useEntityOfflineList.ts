import { useCallback, useEffect, useState } from "react";

export function useEntityOfflineList<T>(
  listFn: () => Promise<T[]>,
  changedEvent: string,
): T[] {
  const [rows, setRows] = useState<T[]>([]);

  const refresh = useCallback(async () => {
    setRows(await listFn());
  }, [listFn]);

  useEffect(() => {
    void refresh();
    window.addEventListener(changedEvent, refresh);
    return () => window.removeEventListener(changedEvent, refresh);
  }, [refresh, changedEvent]);

  return rows;
}

export function useEntityOfflinePendingCount(
  countFn: () => Promise<number>,
  changedEvent: string,
): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await countFn());
  }, [countFn]);

  useEffect(() => {
    void refresh();
    window.addEventListener(changedEvent, refresh);
    return () => window.removeEventListener(changedEvent, refresh);
  }, [refresh, changedEvent]);

  return count;
}
