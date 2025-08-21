export const response = {
  success: <T>(data: T, message = 'Success') => ({
    success: true as const,
    message,
    data,
    timestamp: new Date().toISOString(),
  }),

  error: (message: string, code?: string, details?: unknown) => ({
    success: false as const,
    error: {
      message,
      code,
      details,
    },
    timestamp: new Date().toISOString(),
  }),

  paginated: <T>(
    data: T[],
    pagination: {
      total: number
      page: number
      limit: number
      hasNext?: boolean
    },
  ) => ({
    success: true as const,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    timestamp: new Date().toISOString(),
  }),
} as const

// Type helpers for response inference
export type ApiSuccessResponse<T> = ReturnType<typeof response.success<T>>
export type ApiErrorResponse = ReturnType<typeof response.error>
export type ApiPaginatedResponse<T> = ReturnType<typeof response.paginated<T>>
