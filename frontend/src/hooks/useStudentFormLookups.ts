import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters, listCategories } from "../api/geo";
import { loadGeoKutirLookupCache, saveGeoKutirLookupCache } from "../offline/geoLookupCache";
import { metaGet, metaPut } from "../offline/offlineDbCore";
import { useOnlineStatus } from "./useOnlineStatus";
import type { Category } from "../api/geo";

const STUDENT_META_KEY = "student-form-lookups";

type StudentLookupCache = {
  categories: Category[];
  cachedAt: string;
};

type Options = { enabled?: boolean };

/** Geo + categories for StudentForm add; caches when online for offline add. */
export function useStudentFormLookups(options: Options = {}) {
  const hookEnabled = options.enabled !== false;
  const online = useOnlineStatus();
  const [offlineCacheLoaded, setOfflineCacheLoaded] = useState(false);
  const [geoCached, setGeoCached] = useState<Awaited<ReturnType<typeof loadGeoKutirLookupCache>>>(null);
  const [studentCached, setStudentCached] = useState<StudentLookupCache | null>(null);

  useEffect(() => {
    if (!hookEnabled || online) return;
    let cancelled = false;
    void Promise.all([loadGeoKutirLookupCache(), metaGet<StudentLookupCache>(STUDENT_META_KEY)]).then(
      ([geo, student]) => {
        if (!cancelled) {
          setGeoCached(geo);
          setStudentCached(student);
          setOfflineCacheLoaded(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hookEnabled, online]);

  const fetchEnabled = hookEnabled && online;

  const kutirsQuery = useQuery({
    queryKey: ["all-kutirs"],
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
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    enabled: fetchEnabled,
  });

  useEffect(() => {
    if (!hookEnabled || !online) return;
    const kutirs = kutirsQuery.data;
    const districts = districtsQuery.data;
    const areas = areasQuery.data;
    const clusters = clustersQuery.data;
    if (!kutirs?.length || !districts?.length || !areas?.length || !clusters?.length) return;
    void saveGeoKutirLookupCache({ kutirs, districts, areas, clusters });
  }, [hookEnabled, online, kutirsQuery.data, districtsQuery.data, areasQuery.data, clustersQuery.data]);

  useEffect(() => {
    if (!hookEnabled || !online) return;
    const categories = categoriesQuery.data;
    if (!categories?.length) return;
    void metaPut(STUDENT_META_KEY, {
      categories,
      cachedAt: new Date().toISOString(),
    } satisfies StudentLookupCache);
  }, [hookEnabled, online, categoriesQuery.data]);

  if (!hookEnabled) {
    return {
      allKutirs: [],
      allDistricts: [],
      allAreas: [],
      allClusters: [],
      categories: [],
      online,
      usingOfflineCache: false,
      offlineCacheMissing: false,
      isLoadingLookups: false,
    };
  }

  const allKutirs = online ? (kutirsQuery.data ?? []) : (geoCached?.kutirs ?? []);
  const allDistricts = online ? (districtsQuery.data ?? []) : (geoCached?.districts ?? []);
  const allAreas = online ? (areasQuery.data ?? []) : (geoCached?.areas ?? []);
  const allClusters = online ? (clustersQuery.data ?? []) : (geoCached?.clusters ?? []);
  const categories = online ? (categoriesQuery.data ?? []) : (studentCached?.categories ?? []);

  const geoReady = online
    ? Boolean(kutirsQuery.data?.length && districtsQuery.data?.length)
    : geoCached != null;
  const usingOfflineCache = !online && offlineCacheLoaded && geoReady;
  const offlineCacheMissing = !online && offlineCacheLoaded && !geoReady;

  return {
    allKutirs,
    allDistricts,
    allAreas,
    allClusters,
    categories,
    online,
    usingOfflineCache,
    offlineCacheMissing,
    isLoadingLookups:
      online &&
      (kutirsQuery.isLoading ||
        districtsQuery.isLoading ||
        areasQuery.isLoading ||
        clustersQuery.isLoading ||
        categoriesQuery.isLoading),
  };
}
