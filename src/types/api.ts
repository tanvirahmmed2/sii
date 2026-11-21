import { NextRequest, NextResponse } from 'next/server';

export interface RouteHandlerContext<TParams extends Record<string, string> = { domain: string }> {
  params: Promise<TParams>;
}

export interface ApiResponseSuccess<T = unknown> {
  success: true;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiResponseError {
  success: false;
  message: string;
  error?: string | Record<string, unknown> | null;
  code?: string | number;
}

export type ApiResponse<T = unknown> = ApiResponseSuccess<T> | ApiResponseError;

export type ApiRouteHandler<TParams extends Record<string, string> = { domain: string }> = (
  req: NextRequest,
  context: RouteHandlerContext<TParams>
) => Promise<NextResponse<ApiResponse>>;
