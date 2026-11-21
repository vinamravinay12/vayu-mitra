import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blankEditable } from '../../state/session.js';
import { expectNoViolations } from '../../test-utils/axe.js';
import { DELHI, EXTRACTED, stubFetch, GRANDFATHER } from '../../test-utils/fixtures.js';
import { firstProblem, ProfileForm } from './ProfileForm.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The ProfileForm with the place already chosen. */
function renderChosen(onConfirm = vi.fn()) {
  vi.stubGlobal('fetch', stubFetch({ '/api/places': { body: { places: [DELHI] } } }));
  const view = render(
    <ProfileForm
      initial={{ ...EXTRACTED, place: DELHI, placeQuery: 'New Delhi' }}
      onConfirm={onConfirm}
    />,
  );
  return { ...view, onConfirm };
}

describe('ProfileForm', () => {
  it('edits every part of a member, and only shows travel and timing when they apply', async () => {
    const user = userEvent.setup();
    const { onConfirm, container } = renderChosen();
    const person = screen.getByRole('group', { name: 'Person 1' });
    expect(within(person).queryByLabelText('Travels by')).toBeNull();
    await user.clear(within(person).getByLabelText('Name or role'));
    await user.type(within(person).getByLabelText('Name or role'), 'Nanaji');
    await user.selectOptions(within(person).getByLabelText('Age group'), 'adult');
    await user.click(within(person).getByLabelText('COPD'));
    await user.click(within(person).getByLabelText('asthma'));
    await user.selectOptions(within(person).getByLabelText('During the day'), 'outdoors');
    await user.selectOptions(within(person).getByLabelText('Travels by'), 'cycle');
    fireEvent.change(within(person).getByLabelText('One-way distance (km)'), {
      target: { value: '3' },
    });
    await user.selectOptions(within(person).getByLabelText('Usually at'), '15');
    await user.selectOptions(within(person).getByLabelText('Outdoor exercise'), 'none');
    expect(within(person).queryByLabelText('Usually at')).toBeNull();
    await expectNoViolations(container);
    await user.click(screen.getByRole('button', { name: 'See today’s plan' }));
    expect(onConfirm.mock.calls[0]?.[0].members[0]).toMatchObject({
      name: 'Nanaji',
      ageGroup: 'adult',
      conditions: ['copd'],
      daytime: 'outdoors',
      commuteMode: 'cycle',
      commuteKm: 3,
      exerciseHour: 15,
      outdoorExercise: 'none',
    });
  });

  it('edits the home and routines', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderChosen();
    await user.selectOptions(screen.getByLabelText('Doors and windows'), 'sealed');
    await user.selectOptions(screen.getByLabelText('Windows are usually'), 'rarely');
    await user.selectOptions(screen.getByLabelText('Main cooking fuel'), 'induction');
    await user.selectOptions(screen.getByLabelText('Winter heating'), 'electric');
    await user.click(screen.getByLabelText('We have an air purifier'));
    await user.click(screen.getByLabelText('Kitchen has a chimney or exhaust fan'));
    await user.click(screen.getByLabelText('Mosquito coil'));
    fireEvent.change(screen.getByLabelText('Work or school days a week'), {
      target: { value: '6' },
    });
    await user.selectOptions(screen.getByLabelText('Usually leave home at'), '9');
    fireEvent.change(screen.getByLabelText('Diesel generator hours a week'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Homes in your society or colony'), {
      target: { value: '40' },
    });
    await user.click(screen.getByLabelText('Metro or a reliable bus is within walking distance'));
    await user.click(screen.getByLabelText('We or our society burn leaves or rubbish'));
    await user.click(screen.getByRole('button', { name: 'See today’s plan' }));
    const profile = onConfirm.mock.calls[0]?.[0];
    expect(profile.home).toEqual({
      tightness: 'sealed',
      ventilation: 'rarely',
      hasPurifier: true,
      cookingFuel: 'induction',
      hasKitchenExhaust: true,
      heating: 'electric',
      indoorSources: ['incense', 'mosquito-coil'],
    });
    expect(profile.lifestyle).toEqual({
      workDaysPerWeek: 6,
      departHour: 9,
      burnsWaste: false,
      generatorHoursPerWeek: 0,
      transitNearby: false,
      communityHouseholds: 40,
    });
  });

  it('adds and removes people, and explains what to fix', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderChosen();
    await user.click(screen.getByRole('button', { name: 'Add a person' }));
    expect(screen.getByRole('group', { name: 'Person 3' })).toBeInTheDocument();
    const third = screen.getByRole('group', { name: 'Person 3' });
    await user.clear(within(third).getByLabelText('Name or role'));
    await user.click(within(third).getByRole('button', { name: 'Remove person 3' }));
    await user.click(screen.getByRole('button', { name: 'Remove Asha' }));
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Homes in your society or colony'), {
      target: { value: '0' },
    });
    await user.click(screen.getByRole('button', { name: 'See today’s plan' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please check lifestyle › communityHouseholds',
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('stops adding people at the limit', async () => {
    const user = userEvent.setup();
    renderChosen();
    for (let added = 0; added < 6; added += 1) {
      await user.click(screen.getByRole('button', { name: 'Add a person' }));
    }
    expect(screen.queryByRole('button', { name: 'Add a person' })).toBeNull();
  });

  it('names the person a problem is in', () => {
    const editing = {
      ...EXTRACTED,
      place: DELHI,
      placeQuery: '',
      members: [{ ...GRANDFATHER, name: '' }],
    };
    expect(firstProblem(editing)).toMatch(/^Please check person 1 › name/);
  });
});

describe('PlaceSearch', () => {
  it('searches by button and Enter, chooses a place, and handles no results and errors', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', stubFetch({ '/api/places': { body: { places: [] } } }));
    render(<ProfileForm initial={blankEditable()} onConfirm={vi.fn()} />);
    const input = screen.getByLabelText('City or neighbourhood');
    await user.type(input, 'Atlantis');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('No places found. Try the city name.')).toBeInTheDocument();
    vi.stubGlobal('fetch', stubFetch({ '/api/places': { body: { places: [DELHI] } } }));
    await user.type(input, '{Enter}');
    await user.click(await screen.findByRole('button', { name: 'New Delhi, Delhi, India' }));
    expect(screen.getByText('Forecast for New Delhi, Delhi, India.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Delhi, Delhi, India' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    vi.stubGlobal('fetch', stubFetch({}));
    await user.clear(input);
    await user.type(input, 'x{Enter}');
    await user.type(input, 'y{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('could not reach');
  });
});
