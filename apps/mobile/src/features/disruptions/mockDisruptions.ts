import type { Disruption } from './types';

/** Hardcoded until the backend `/disruptions` endpoint is ready. */
const MOCK_DISRUPTIONS: Disruption[] = [
  {
    id: 'disruption-1',
    occurredAt: '2026-05-07T07:42:00Z',
    description:
      'Signal failure at Central Station causing significant delays on all inbound services. Engineers are on site and working to restore normal operations.',
    affectedRoutes: ['Downtown express', 'Evening return'],
  },
  {
    id: 'disruption-2',
    occurredAt: '2026-05-07T09:15:00Z',
    description:
      'Road closure on Campus Drive due to a water main burst. Buses are being diverted via Library Road, adding approximately 10 minutes to journey times.',
    affectedRoutes: ['Campus loop'],
  },
  {
    id: 'disruption-3',
    occurredAt: '2026-05-07T11:30:00Z',
    description:
      'Planned maintenance work on the Riverside bridge has overrun. Services crossing the bridge are suspended until further notice.',
    affectedRoutes: ['Evening return'],
  },
  {
    id: 'disruption-4',
    occurredAt: '2026-05-06T18:05:00Z',
    description:
      'Vehicle breakdown near the Student Union stop blocking the bus lane. Delays of up to 15 minutes expected on affected routes.',
    affectedRoutes: ['Campus loop', 'Downtown express'],
  },
];

/** Simulates network latency; replace with `fetch` when backend is ready. */
export async function fetchDisruptions(): Promise<Disruption[]> {
  await new Promise((r) => setTimeout(r, 350));
  return [...MOCK_DISRUPTIONS];
}
