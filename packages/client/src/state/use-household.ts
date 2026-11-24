import type { AlertSettings, Memory, Place } from '@vayu/core';
import { useCallback, useEffect, useState } from 'react';
import type { Api, Household } from '../api/api.js';
import { messageOf } from './use-startup.js';

export interface HouseholdState {
  readonly household: Household | null;
  readonly error: string | null;
  readonly setMemory: (memory: Memory) => void;
  readonly setPlace: (place: Place) => void;
  readonly setAlerts: (alerts: AlertSettings) => void;
  /** Replaces the record with one the server returned, e.g. after a chat turn. */
  readonly replace: (household: Household) => void;
  readonly saveWith: (save: () => Promise<Household>) => void;
}

/** The record as loaded from the server, the last error, and saving a change. */
function useRecord(api: Api) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.me().then(setHousehold, (cause: unknown) => {
      setError(messageOf(cause));
    });
  }, [api]);
  const saveWith = useCallback((save: () => Promise<Household>) => {
    setError(null);
    save().then(setHousehold, (cause: unknown) => {
      setError(messageOf(cause));
    });
  }, []);
  return { household, setHousehold, error, saveWith };
}

/**
 * The family's record. Changes show at once and are saved; the server's answer
 * replaces the local copy, and a failed save brings the error into view.
 */
export function useHousehold(api: Api): HouseholdState {
  const { household, setHousehold, error, saveWith } = useRecord(api);
  const change = useCallback(
    <K extends 'memory' | 'place' | 'alerts'>(
      key: K,
      value: Household[K],
      save: () => Promise<Household>,
    ) => {
      setHousehold((current) => (current === null ? current : { ...current, [key]: value }));
      saveWith(save);
    },
    [saveWith],
  );
  return {
    household,
    error,
    setMemory: (memory) => {
      change('memory', memory, () => api.saveMemory(memory));
    },
    setPlace: (place) => {
      change('place', place, () => api.savePlace(place));
    },
    setAlerts: (alerts) => {
      change('alerts', alerts, () => api.saveAlerts(alerts));
    },
    replace: setHousehold,
    saveWith,
  };
}
