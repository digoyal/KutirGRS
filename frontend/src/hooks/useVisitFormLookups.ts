import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { loadVisitLookupCache, saveVisitLookupCache } from "../offline/visitOfflineDb";
import { useOnlineStatus } from "./useOnlineStatus";

type Options = { enabled?: boolean };

/** Kutirs + geo for VisitForm; caches to IndexedDB when online for offline add. */
export function useVisitFormLookups(options: Options = {}) {
  const hookEnabled = options.enabled !== false;
  const online = useOnlineStatus();
  const [offlineCacheLoaded, setOfflineCacheLoaded] = useState(false);
  const [cached, setCached] = useState<Awaited<ReturnType<typeof loadVisitLookupCache>>>(null);

  useEffect(() => {
    if (!hookEnabled || online) return;
    let cancelled = false;
    void loadVisitLookupCache().then((data) => {
      if (!cancelled) {
        setCached(data);
        setOfflineCacheLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hookEnabled, online]);

  const fetchEnabled = hookEnabled && online;

  const kutirsQuery = useQuery({
    queryKey: ["kutirs"],
    queryFn: () => listKutirs(),
    enabled: fetchEnabled,
  });
  const districtsQuery = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
    enabled: fetchEnabled,
  });
  const areasQuery = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
    enabled: fetchEnabled,
  });
  const clustersQuery = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
    enabled: fetchEnabled,
  });

  useEffect(() => {
    if (!hookEnabled || !online) return;
    const kutirs = kutirsQuery.data;
    const districts = districtsQuery.data;
    const areas = areasQuery.data;
    const clusters = clustersQuery.data;
    if (!kutirs?.length || !districts?.length || !areas?.length || !clusters?.length) return;
    void saveVisitLookupCache({ kutirs, districts, areas, clusters });
  }, [hookEnabled, online, kutirsQuery.data, districtsQuery.data, areasQuery.data, clustersQuery.data]);

  if (!hookEnabled) {
    return {
      kutirs: [],
      allDistricts: [],
      allAreas: [],
      allClusters: [],
      online,
      usingOfflineCache: false,
      offlineCacheMissing: false,
      isLoadingLookups: false,
    };
  }

  const kutirs = online ? (kutirsQuery.data ?? []) : (cached?.kutirs ?? []);
  const allDistricts = online ? (districtsQuery.data ?? []) : (cached?.districts ?? []);
  const allAreas = online ? (areasQuery.data ?? []) : (cached?.areas ?? []);
  const allClusters = online ? (clustersQuery.data ?? []) : (cached?.clusters ?? []);

  const usingOfflineCache = !online && offlineCacheLoaded && cached != null;
  const offlineCacheMissing = !online && offlineCacheLoaded && cached == null;

  return {
    kutirs,
    allDistricts,
    allAreas,
    allClusters,
    online,
    usingOfflineCache,
    offlineCacheMissing,
    isLoadingLookups:
      online &&
      (kutirsQuery.isLoading ||
        districtsQuery.isLoading ||
        areasQuery.isLoading ||
        clustersQuery.isLoading),
  };
}
