import type { Home } from '@vayu/core';
import {
  COOKING_LABELS,
  HEATING_LABELS,
  INDOOR_SOURCE_LABELS,
  TIGHTNESS_LABELS,
  VENTILATION_LABELS,
} from '../../lib/labels.js';
import { CheckboxGroup } from './CheckboxGroup.js';
import { CheckboxField, SelectField } from './fields.js';

interface HomeFieldsProps {
  readonly home: Home;
  readonly isAssumed: (field: keyof Home) => boolean;
  readonly onChange: (home: Home) => void;
}

/** How much outdoor smog gets in: draughts and window habits. */
function AirTightness({ home, isAssumed, onChange }: HomeFieldsProps): React.JSX.Element {
  return (
    <>
      <SelectField
        label="Doors and windows"
        value={home.tightness}
        options={TIGHTNESS_LABELS}
        assumed={isAssumed('tightness')}
        onChange={(tightness) => {
          onChange({ ...home, tightness });
        }}
      />
      <SelectField
        label="Windows are usually"
        value={home.ventilation}
        options={VENTILATION_LABELS}
        assumed={isAssumed('ventilation')}
        onChange={(ventilation) => {
          onChange({ ...home, ventilation });
        }}
      />
    </>
  );
}

/** What burns inside: the stove and the heater. */
function Fuels({ home, isAssumed, onChange }: HomeFieldsProps): React.JSX.Element {
  return (
    <>
      <SelectField
        label="Main cooking fuel"
        value={home.cookingFuel}
        options={COOKING_LABELS}
        assumed={isAssumed('cookingFuel')}
        onChange={(cookingFuel) => {
          onChange({ ...home, cookingFuel });
        }}
      />
      <SelectField
        label="Winter heating"
        value={home.heating}
        options={HEATING_LABELS}
        assumed={isAssumed('heating')}
        onChange={(heating) => {
          onChange({ ...home, heating });
        }}
      />
    </>
  );
}

/** The home: how much smog leaks in, and what burns inside it. */
export function HomeFields(props: HomeFieldsProps): React.JSX.Element {
  const { home, isAssumed, onChange } = props;
  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-semibold">Your home</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <AirTightness {...props} />
        <Fuels {...props} />
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <CheckboxField
          label="We have an air purifier"
          checked={home.hasPurifier}
          assumed={isAssumed('hasPurifier')}
          onChange={(hasPurifier) => {
            onChange({ ...home, hasPurifier });
          }}
        />
        <CheckboxField
          label="Kitchen has a chimney or exhaust fan"
          checked={home.hasKitchenExhaust}
          assumed={isAssumed('hasKitchenExhaust')}
          onChange={(hasKitchenExhaust) => {
            onChange({ ...home, hasKitchenExhaust });
          }}
        />
      </div>
      <CheckboxGroup
        legend="Also burned indoors"
        values={home.indoorSources}
        options={INDOOR_SOURCE_LABELS}
        onChange={(indoorSources) => {
          onChange({ ...home, indoorSources });
        }}
      />
    </fieldset>
  );
}
