export interface Query {
  query_id: string;
  user_id: number;
  search_query: {
    type: string;
    fields: Record<string, any>;
    filters?: Record<string, any>;
  };
  total_results: number | null;
  updated_at: string;
  last_search: string;
  is_bookmark: boolean;
}

export interface QueriesResponse {
  queries: Array<Query>;
  total: number;
  page: number;
  page_size: number;
}

export interface UpdateQueryResponse extends Query {
  message: string;
}

export type QueryType = "recent" | "bookmark";
