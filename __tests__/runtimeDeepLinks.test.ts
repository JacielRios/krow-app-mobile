import { rideFromLink } from '../src/features/ride-runtime/deepLinks';

describe('verified trip links', () => {
  const origin = 'https://trips.example.test';
  const id = '9ded1065-1234-4321-8abc-934912a021bc';
  it('accepts only the configured HTTPS origin and a trip identifier', () => {
    expect(rideFromLink(`${origin}/rides/${id}`, origin)).toBe(id);
    expect(rideFromLink(`${origin}.evil.test/rides/${id}`, origin)).toBeNull();
    expect(
      rideFromLink(`http://trips.example.test/rides/${id}`, origin),
    ).toBeNull();
    expect(rideFromLink(`${origin}/rides/${id}`, undefined)).toBeNull();
    expect(rideFromLink(`${origin}/rides/../../admin`, origin)).toBeNull();
  });
});
