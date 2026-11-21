import { PROFILE_LIMITS, type Lifestyle } from '@vayu/core';
import { CheckboxField, HourField, NumberField } from './fields.js';

interface LifestyleFieldsProps {
  readonly lifestyle: Lifestyle;
  readonly isAssumed: (field: keyof Lifestyle) => boolean;
  readonly onChange: (lifestyle: Lifestyle) => void;
}

/** The weekly rhythm: work days, leaving time, generator use and society size. */
function Rhythm({ lifestyle, isAssumed, onChange }: LifestyleFieldsProps): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField
        label="Work or school days a week"
        value={lifestyle.workDaysPerWeek}
        min={0}
        max={7}
        assumed={isAssumed('workDaysPerWeek')}
        onChange={(workDaysPerWeek) => {
          onChange({ ...lifestyle, workDaysPerWeek });
        }}
      />
      <HourField
        label="Usually leave home at"
        value={lifestyle.departHour}
        assumed={isAssumed('departHour')}
        onChange={(departHour) => {
          onChange({ ...lifestyle, departHour });
        }}
      />
      <NumberField
        label="Diesel generator hours a week"
        value={lifestyle.generatorHoursPerWeek}
        min={0}
        max={PROFILE_LIMITS.maxGeneratorHoursPerWeek}
        assumed={isAssumed('generatorHoursPerWeek')}
        onChange={(generatorHoursPerWeek) => {
          onChange({ ...lifestyle, generatorHoursPerWeek });
        }}
      />
      <NumberField
        label="Homes in your society or colony"
        value={lifestyle.communityHouseholds}
        min={1}
        max={PROFILE_LIMITS.maxCommunityHouseholds}
        assumed={isAssumed('communityHouseholds')}
        onChange={(communityHouseholds) => {
          onChange({ ...lifestyle, communityHouseholds });
        }}
      />
    </div>
  );
}

/** Weekly routines and the community the family lives in. */
export function LifestyleFields(props: LifestyleFieldsProps): React.JSX.Element {
  const { lifestyle, isAssumed, onChange } = props;
  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-semibold">Routines and community</legend>
      <Rhythm {...props} />
      <div className="grid gap-x-4 sm:grid-cols-2">
        <CheckboxField
          label="Metro or a reliable bus is within walking distance"
          checked={lifestyle.transitNearby}
          assumed={isAssumed('transitNearby')}
          onChange={(transitNearby) => {
            onChange({ ...lifestyle, transitNearby });
          }}
        />
        <CheckboxField
          label="We or our society burn leaves or rubbish"
          checked={lifestyle.burnsWaste}
          assumed={isAssumed('burnsWaste')}
          onChange={(burnsWaste) => {
            onChange({ ...lifestyle, burnsWaste });
          }}
        />
      </div>
    </fieldset>
  );
}
