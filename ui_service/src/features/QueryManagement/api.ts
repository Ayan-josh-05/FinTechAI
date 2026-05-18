import * as Sentry from "@sentry/tanstackstart-react";
import type { QueriesResponse, QueryType, UpdateQueryResponse, Query } from "./types";
import api from "@/integrations/axiosInterceptor";

export const getQueries = async (queryType: QueryType, page: number, pageSize: number) => {
  return Sentry.startSpan({ name: "Fetching queries" }, async () => {
    const response = await api.get<QueriesResponse>(
      `/query/user-queries?query_type=${queryType}&page=${page}&page_size=${pageSize}`
    );
    return response.data;
  });
};

export const updateQueryBookmark = async (queryId: string, isBookmark: boolean) => {
  return Sentry.startSpan({ name: "Updating query bookmark status" }, async () => {
    const response = await api.patch<UpdateQueryResponse>(
      `/query/update/${queryId}`,
      { is_bookmark: isBookmark }
    );
    return response.data;
  });
};

export const getQueryById = async (queryId: string): Promise<Query> => {
  return Sentry.startSpan({ name: "Fetching query details" }, async () => {
    const response = await api.get<Query>(`/search/legal-discovery/${queryId}`);
    return response.data;
  });
};
