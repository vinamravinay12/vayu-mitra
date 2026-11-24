import { type Memory } from '../memory/memory-schema.js';
import { DADI, PAPA } from '../test-utils/fixtures.js';

export const memory: Memory = {
  people: [DADI, PAPA],
  routines: [
    {
      kind: 'routine',
      id: 'routine:walk:dadi',
      activity: 'walk',
      personId: DADI.id,
      time: '06:30',
      minutes: 30,
    },
    {
      kind: 'routine',
      id: 'routine:walk:papa',
      activity: 'walk',
      personId: PAPA.id,
      time: '19:00',
      minutes: 40,
    },
    {
      kind: 'routine',
      id: 'routine:open-windows:family',
      activity: 'open-windows',
      personId: null,
      time: null,
      minutes: 15,
    },
  ],
  home: [],
};
