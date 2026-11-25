/** Indoor air hacks: cheap habits that keep smog out of the home, tailored to who lives there and what it has. */
import { sensitivePeople } from '../advice/advise-activity.js';
import type { Memory } from '../memory/memory-schema.js';

/** One habit and why it helps. */
export interface IndoorHack {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

/** The room to keep cleanest: the most sensitive person's, or the bedroom. */
const cleanRoomFor = (memory: Memory): string => {
  const [first] = sensitivePeople(memory.people);
  return first === undefined ? 'the bedroom' : `${first}’s room`;
};

/** With a purifier: run it where it counts. Without: make one room the clean room. */
function roomHack(memory: Memory): IndoorHack {
  const room = cleanRoomFor(memory);
  return memory.home.some((fact) => fact.feature === 'air-purifier')
    ? {
        id: 'purifier-room',
        title: `Run the purifier in ${room}, door shut`,
        detail:
          'A purifier cleans one closed room, not the house. Run it on high for the first hour, then on auto, and keep it running at night.',
      }
    : {
        id: 'clean-room',
        title: `Make ${room} the clean room`,
        detail:
          'Keep its windows shut, tuck a damp towel along the gap under the door, and spend the worst hours there. A HEPA purifier sized for that one room is the best single buy.',
      };
}

/** Habits that help any home. */
const EVERY_HOME: readonly IndoorHack[] = [
  {
    id: 'cooking',
    title: 'Lid on, chimney or exhaust on while cooking',
    detail:
      'Frying and tadka are the biggest smoke source inside most homes. Run the exhaust for ten minutes after you finish too.',
  },
  {
    id: 'no-smoke',
    title: 'No incense, mosquito coils or candles on smog days',
    detail: 'Each adds fine particles indoors, on top of what seeps in from outside.',
  },
  {
    id: 'wet-clean',
    title: 'Wet-mop and wipe instead of sweeping',
    detail: 'A broom lifts settled dust back into the air; a damp cloth keeps it down.',
  },
];

/** The hacks for this household: its room first, then what helps any home. */
export function indoorHacks(memory: Memory): IndoorHack[] {
  return [roomHack(memory), ...EVERY_HOME];
}
