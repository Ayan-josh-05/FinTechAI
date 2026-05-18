import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { ToastNotifications } from "../shared/components";
import { getQueries, updateQueryBookmark } from "./api";
import type { QueriesResponse, QueryType } from "./types";

const QUERY_KEYS = {
  queries: "queries",
} as const;

export const useQueries = (
  queryType: QueryType,
  page: number,
  pageSize: number,
  options?: Partial<UseQueryOptions<QueriesResponse>>
) => {
  return useQuery<QueriesResponse>({
    queryKey: ["queries", queryType, page, pageSize],
    queryFn: () => getQueries(queryType, page, pageSize),
    placeholderData: (prev) => prev,
    ...options,
  });
};

export const useUpdateQueryBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queryId, isBookmark }: { queryId: string; isBookmark: boolean }) =>
      updateQueryBookmark(queryId, isBookmark),
    onSuccess: (_, variables) => {
      if (variables.isBookmark) {
        ToastNotifications.queryBookmarked();
      } else {
        ToastNotifications.queryUnBookmarked();
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.queries] });
    },
  });
};
