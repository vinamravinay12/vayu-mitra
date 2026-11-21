import { describe, expect, it } from 'vitest';
import { evaluateAlerts } from './evaluate-alerts.js';

describe('evaluateAlerts', () => {
  it('raises the urgent carbon-monoxide warning first, whatever the AQI', () => {
    const alerts = evaluateAlerts({
      heating: 'coal-or-wood',
      aqiCategory: 'severe',
      hasRespiratory: true,
    });
    expect(alerts.map((alert) => alert.id)).toEqual([
      'carbon-monoxide',
      'respiratory-plan',
      'severe-day',
    ]);
    expect(
      evaluateAlerts({ heating: 'kerosene', aqiCategory: 'good' }).map((alert) => alert.id),
    ).toEqual(['carbon-monoxide']);
  });

  it('targets vulnerable members on bad days only', () => {
    const family = {
      hasInfant: true,
      hasChild: true,
      hasSenior: true,
      conditions: ['pregnancy', 'heart-disease'],
    };
    expect(evaluateAlerts({ ...family, aqiCategory: 'moderate' })).toEqual([]);
    expect(
      evaluateAlerts({ ...family, aqiCategory: 'very-poor' }).map((alert) => alert.id),
    ).toEqual([
      'heart-strain',
      'pregnancy',
      'infant-no-mask',
      'children-outdoor-play',
      'senior-walks',
    ]);
  });
});
