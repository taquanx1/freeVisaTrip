import type { ApiErrorBody, FlightSearchResponse, ReturnSearchResponse, SearchContext, VisaMapResponse } from '../shared/types'

export class ApiError extends Error {
  constructor(public code: string, message: string, public retryable = false) { super(message) }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const data = await response.json() as T | ApiErrorBody
  if (!response.ok) {
    const issue = (data as ApiErrorBody).error
    throw new ApiError(issue?.code ?? 'UNKNOWN', issue?.message ?? 'Something went wrong.', issue?.retryable)
  }
  return data as T
}

export const getVisaMap = (passports: string[], signal?: AbortSignal) => request<VisaMapResponse>(`/api/visa-map?passports=${passports.join(',')}`, { signal })
export const searchFlights = (context: SearchContext, signal?: AbortSignal) => request<FlightSearchResponse>('/api/flights/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(context), signal })
export const searchReturns = (context: SearchContext, outboundToken: string, signal?: AbortSignal) => request<ReturnSearchResponse>('/api/flights/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context, outboundToken }), signal })
