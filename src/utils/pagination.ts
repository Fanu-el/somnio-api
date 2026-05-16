/**
 * Pagination helper for consistent API responses
 */

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
}

/**
 * Creates a paginated response object
 * @param items - The data items for current page
 * @param limit - Items per page
 * @param offset - Current offset
 * @param total - Total items available
 */
export function paginate<T>(
  items: T[],
  limit: number,
  offset: number,
  total: number,
): PaginatedResponse<T> {
  return {
    items,
    total,
    page: Math.floor(offset / limit) + 1,
  };
}
