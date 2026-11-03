import { useQuery } from "@tanstack/react-query";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters, listCategories } from "../api/geo";

type Options = { enabled?: boolean };

/** Geo + categories for StudentForm add mode. */
export function useStudentFormLookups(options: Options = {}) {
  const hookEnabled = options.enabled !== false;

  const kutirsQuery = useQuery({
    queryKey: ["all-kutirs"],
    queryFn: () => listKutirs(),
    enabled: hookEnabled,
  });
  const districtsQuery = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
    enabled: hookEnabled,
  });
  const areasQuery = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
    enabled: hookEnabled,
  });
  const clustersQuery = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
    enabled: hookEnabled,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    enabled: hookEnabled,
  });

  if (!hookEnabled) {
    return {
      allKutirs: [],
      allDistricts: [],
      allAreas: [],
      allClusters: [],
      categories: [],
      isLoadingLookups: false,
    };
  }

  return {
    allKutirs: kutirsQuery.data ?? [],
    allDistricts: districtsQuery.data ?? [],
    allAreas: areasQuery.data ?? [],
    allClusters: clustersQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoadingLookups:
      kutirsQuery.isLoading ||
      districtsQuery.isLoading ||
      areasQuery.isLoading ||
      clustersQuery.isLoading ||
      categoriesQuery.isLoading,
  };
}
