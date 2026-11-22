/** Precautions the engine can attach to advice, each with the words the app shows. */
export const ADVICE_TIPS = {
  'wear-n95': 'Wear a well-fitted N95 mask; a cloth or surgical mask does little for PM2.5.',
  'get-n95': 'An N95 mask helps; cloth and surgical masks do little for PM2.5.',
  'ease-off': 'Keep it shorter and gentler than usual, so breathing stays easy.',
  'avoid-traffic': 'Stay away from main roads; smog is worst beside traffic.',
  'carry-inhaler': 'Carry the reliever inhaler and stop at the first sign of tightness.',
  'run-purifier': 'Keep windows shut and run the air purifier in the room you use most.',
  'keep-windows-shut': 'Keep windows shut while the air is this bad.',
  recirculate: 'In the car, keep windows up and the AC on recirculate.',
} as const;

export type AdviceTip = keyof typeof ADVICE_TIPS;

export const ADVICE_TIP_IDS = Object.keys(ADVICE_TIPS) as AdviceTip[];
