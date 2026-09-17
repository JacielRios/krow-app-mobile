import { Platform } from 'react-native';
import { createShadow, elevationSpecs } from '../src/shared/theme/elevation';

describe('createShadow', () => {
  it('defines all five semantic elevation levels', () => {
    expect(Object.keys(elevationSpecs)).toEqual(['0', '1', '2', '3', '4']);
  });

  it('returns a flat style for level zero', () => {
    const style = createShadow(0, '#123456');
    if (Platform.OS === 'android') expect(style.elevation).toBe(0);
    if (Platform.OS === 'ios') expect(style.shadowOpacity).toBe(0);
  });

  it('uses progressively higher depth values', () => {
    expect(elevationSpecs[4].elevation).toBeGreaterThan(elevationSpecs[2].elevation);
    expect(elevationSpecs[4].radius).toBeGreaterThan(elevationSpecs[2].radius);
  });
});
