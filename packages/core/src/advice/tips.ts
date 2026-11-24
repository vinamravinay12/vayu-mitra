/** The precautions the engine can give, each with the words the app shows. */

/** Precautions the engine can attach to advice. */
export const ADVICE_TIP_IDS = [
  'wear-n95',
  'get-n95',
  'ease-off',
  'avoid-traffic',
  'carry-inhaler',
  'run-purifier',
  'keep-windows-shut',
  'recirculate',
  'mask-for-stops',
  'avoid-rush-hour',
] as const;

/** One precaution the engine can give. */
export type AdviceTip = (typeof ADVICE_TIP_IDS)[number];

/** The words the app shows for each precaution; the type makes every id have exactly one. */
export const ADVICE_TIPS: Readonly<Record<AdviceTip, string>> = {
  'wear-n95': 'Wear a well-fitted N95 mask; a cloth or surgical mask does little for PM2.5.',
  'get-n95': 'An N95 mask helps; cloth and surgical masks do little for PM2.5.',
  'ease-off': 'Keep it shorter and gentler than usual, so breathing stays easy.',
  'avoid-traffic': 'Stay away from main roads; smog is worst beside traffic.',
  'carry-inhaler': 'Carry the reliever inhaler and stop at the first sign of tightness.',
  'run-purifier': 'Keep windows shut and run the air purifier in the room you use most.',
  'keep-windows-shut': 'Keep windows shut while the air is this bad.',
  recirculate: 'In the car, keep windows up and the AC on recirculate.',
  'mask-for-stops': 'Keep an N95 handy for when you step out at stops.',
  'avoid-rush-hour':
    'Avoid rush hour if you can; queues of traffic are where the smog is thickest.',
};
