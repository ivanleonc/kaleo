export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}
export interface PagedResponse<T> {
    success: boolean;
    message?: string;
    data: T[];
    total: number;
    page: number;
    limit: number;
}
export interface CursorResponse<T> {
    success: boolean;
    message?: string;
    data: T[];
    nextCursor: string | null;
    hasNext: boolean;
    limit: number;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}
