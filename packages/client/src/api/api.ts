import {
  airReportSchema,
  alertSettingsSchema,
  chatResponseSchema,
  memorySchema,
  placeSchema,
  type AirReport,
  type AlertSettings,
  type ChatRequest,
  type ChatResponse,
  type Memory,
  type Place,
} from '@vayu/core';
import { z } from 'zod';
import { expectShape, requestJson, type TokenSource } from './http.js';

/** The family's record as the server shows it. */
export const householdSchema = z.object({
  memory: memorySchema,
  place: placeSchema.nullable(),
  alerts: alertSettingsSchema,
  pushEnabled: z.boolean(),
});

export type Household = z.infer<typeof householdSchema>;

export type { ClientConfig } from './config.js';

/** No token: for public routes. */
const noToken: TokenSource = () => Promise.resolve(null);

/** Every call the app makes, each re-validated before the UI sees it. */
export function createApi(token: TokenSource) {
  const household = async (path: string, method: 'PUT' | 'POST' | 'DELETE', body: unknown) =>
    expectShape(householdSchema, await requestJson(path, token, { method, body }), 'household');
  return {
    async searchPlaces(query: string): Promise<readonly Place[]> {
      const path = `/api/places?${new URLSearchParams({ q: query }).toString()}`;
      return expectShape(
        z.object({ places: z.array(placeSchema) }),
        await requestJson(path, noToken),
        'place search',
      ).places;
    },
    async air(place: Place): Promise<AirReport> {
      const query = new URLSearchParams({
        lat: String(place.latitude),
        lon: String(place.longitude),
      });
      return expectShape(
        airReportSchema,
        await requestJson(`/api/air?${query.toString()}`, noToken),
        'air report',
      );
    },
    async me(): Promise<Household> {
      return expectShape(householdSchema, await requestJson('/api/me', token), 'household');
    },
    saveMemory: (memory: Memory) => household('/api/me/memory', 'PUT', memory),
    savePlace: (place: Place) => household('/api/me/place', 'PUT', place),
    saveAlerts: (alerts: AlertSettings) => household('/api/me/alerts', 'PUT', alerts),
    addPushId: (id: string) => household('/api/me/push-id', 'POST', { id }),
    removePushId: (id: string) => household('/api/me/push-id', 'DELETE', { id }),
    async deleteEverything(): Promise<void> {
      await requestJson('/api/me', token, { method: 'DELETE' });
    },
    async chat(request: ChatRequest): Promise<ChatResponse> {
      return expectShape(
        chatResponseSchema,
        await requestJson('/api/chat', token, { method: 'POST', body: request }),
        'reply',
      );
    },
  };
}

export type Api = ReturnType<typeof createApi>;
