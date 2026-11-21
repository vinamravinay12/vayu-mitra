/**
 * Things a housing society, colony or residents' group can do together.
 *
 * `pm25GramsWeeklyPerHousehold` is what a typical participating household
 * saves (from the same factors as household-sources.ts and commute-modes.ts),
 * and `typicalParticipation` is the share of households that usually join such
 * a drive. Both are documented in docs/ASSUMPTIONS.md.
 */
export interface CommunityActionDefinition {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly string[];
  readonly why: string;
  readonly pm25GramsWeeklyPerHousehold: number;
  readonly typicalParticipation: number;
}

/** Community-scale actions, offered to every household. */
export const COMMUNITY_ACTIONS: readonly CommunityActionDefinition[] = [
  {
    id: 'no-burning-compact',
    title: 'Agree a no-burning rule with a shared compost pit',
    steps: [
      'Propose it at the next residents’ meeting; ask the gardeners and guards to stop burning leaves.',
      'Set up one compost pit or drum for garden and kitchen waste.',
    ],
    why: 'Leaf and waste fires are lit at street level, right where children walk and play.',
    pm25GramsWeeklyPerHousehold: 16,
    typicalParticipation: 0.3,
  },
  {
    id: 'society-carpool-board',
    title: 'Start a carpool group for offices and schools',
    steps: [
      'Make a chat group or notice-board sheet with routes and departure times.',
      'Pair families whose children attend the same school.',
    ],
    why: 'Every shared trip takes a car off the road during the morning rush, when smog is worst.',
    pm25GramsWeeklyPerHousehold: 3,
    typicalParticipation: 0.2,
  },
  {
    id: 'clean-air-room',
    title: 'Set up a clean-air room in the community hall',
    steps: [
      'Pool funds for one or two HEPA purifiers for the hall or clubhouse.',
      'Open it on severe days for older residents, babies and anyone without a purifier at home.',
    ],
    why: 'Not every family can afford a purifier. A shared clean room protects the most vulnerable neighbours on the worst days.',
    pm25GramsWeeklyPerHousehold: 0,
    typicalParticipation: 0.1,
  },
  {
    id: 'report-pollution',
    title: 'Report garbage fires and construction dust',
    steps: [
      'Report open burning or uncovered construction sites to your city’s pollution-complaint helpline or app, with a photo and location.',
      'Follow up as a group: complaints from many residents get acted on faster.',
    ],
    why: 'Enforcement against local burning and dust is one of the quickest ways to cut neighbourhood smog.',
    pm25GramsWeeklyPerHousehold: 5,
    typicalParticipation: 0.15,
  },
];
