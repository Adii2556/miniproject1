// Built-in sample documents so the app is delightful even without a file handy.
export interface SampleDoc {
  id: string;
  name: string;
  label: string;
  tone: string;
  wordsHint: string;
  content: string;
}

export const SAMPLES: SampleDoc[] = [
  {
    id: 'market-brief',
    name: 'Meridian-Market-Brief.md',
    label: 'Market brief',
    tone: 'Positive',
    wordsHint: '~420 words',
    content: `Meridian Robotics — Q3 Market Brief

Meridian Robotics closed Q3 with revenue of $48.2 million, up 31% year over year and ahead of the $44 million consensus. Net dollar retention reached 128%, the highest in company history, driven almost entirely by expansion within existing manufacturing accounts. Gross margins held steady at 64% despite the launch of our new Atlas pick-and-place arm, which customers are adopting faster than forecast.

Three developments stood out this quarter. First, the Atlas platform shipped to 41 customers, and early deployments report a median 22% reduction in line changeover time. Second, our partnership with Helio Manufacturing Group converted from a pilot to a three-year, $12 million framework agreement covering six plants across the Midwest. Third, pipeline coverage for Q4 improved to 3.4x, the strongest position we have entered a fourth quarter with.

Competition intensified in two segments. European rival Kael Dynamics cut pricing by roughly 8% and shipped a comparable low-payload arm, though early reliability reviews favor Meridian. Win rates in head-to-head deals slipped from 61% to 57%. Mitigation plans are in motion, centered on a reference-customer tour and a bundled service contract that Kael does not match.

Hiring remains disciplined. Headcount grew 9% to 610 employees, concentrated in field engineering and solutions architecture. Research and development spend held at 18% of revenue, focused on the vision stack that underpins Atlas autonomy.

Guidance for Q4 is revenue of $52–54 million with flat margins, implying full-year revenue near $185 million. Leadership cautioned that tariff policy on imported actuator components could pressure cost of goods by up to 150 basis points in fiscal 2027 if current proposals pass unchanged. The board will review a hedging strategy in November.

Customer sentiment is unusually strong. Net promoter score climbed to 72, up eleven points, and unsolicited praise for the Atlas teach pendant appeared in ninety-one support tickets without prompting. Churn remains negligible; the single logo lost this quarter cited a plant closure rather than product dissatisfaction.

Outlook: execution risk is moderate, demand is robust, and the competitive response plan is credible. Investors should focus on Atlas attach rates and the Kael pricing response over the next two quarters.`,
  },
  {
    id: 'edge-ai',
    name: 'The-Quiet-Edge-AI-Shift.md',
    label: 'Research article',
    tone: 'Neutral',
    wordsHint: '~450 words',
    content: `The Quiet Shift Happening at the Edge of AI

For the past decade, the story of artificial intelligence has been told in data centers: bigger clusters, longer contexts, larger models. But a parallel revolution has been unfolding in devices that fit in a pocket — phones, cameras, appliances, and sensors — and it is reshaping how AI reaches ordinary people.

Edge inference, running models directly on devices rather than in the cloud, has crossed a practical threshold. Three forces converged. Quantization techniques now compress capable models to four-bit precision with modest quality loss. Neural processing units ship in virtually every flagship phone, delivering tens of trillions of operations per second at milliwatt budgets. And distillation — training small student models to imitate large teachers — has produced models under four billion parameters that match last generation's giants on common benchmarks.

The consequences are structural, not cosmetic. Latency collapses when inference happens locally: voice assistants respond in under a hundred milliseconds, and camera features like on-device translation work offline. Privacy improves by construction, since sensitive data never leaves the device — a decisive advantage for healthcare, finance, and personal assistants. Operating costs fall for vendors, because inference happens on hardware the customer already owns.

Not everything moved to the edge, and that is the point. Cloud models remain superior for long-context reasoning, tool use, and up-to-date knowledge. The emerging pattern is hierarchical: small local models handle perception and routine tasks; larger remote models are consulted sparingly, like specialists. Apple, Google, and Microsoft all shipped hybrid architectures this year, routing requests between on-device and cloud models by complexity.

Challenges remain real. Model quality still degrades at small scale for multilingual and long-form tasks. Updating thousands of model variants across a device fleet is an operational headache. And measuring on-device behavior — as opposed to testing a canonical cloud model — demands new evaluation discipline.

Still, the direction is unmistakable. When a four-bit model on a phone can draft your email, transcribe your meeting, and describe what your camera sees, the cloud becomes a choice rather than a requirement. For developers, the lesson is simple: design for a hybrid world, where the cheapest inference is the one that never crosses the network.`,
  },
  {
    id: 'postmortem',
    name: 'Project-Aurora-Postmortem.md',
    label: 'Incident retro',
    tone: 'Mixed',
    wordsHint: '~430 words',
    content: `Project Aurora — Postmortem: The Night Checkout Fell Over

On Tuesday, October 14, at 02:17 UTC, Meridian's customer-facing checkout service began returning 503 errors for a subset of EU customers. By the time the incident was declared resolved at 04:53, an estimated 38,000 purchase attempts had failed, and roughly $1.9 million in cart value had been abandoned. Not every lesson from Aurora is comfortable, but every lesson is worth keeping.

What happened: a routine database migration introduced an index on the orders table at 02:05. Within twelve minutes, write latency climbed past 900 milliseconds as the migration backfilled 240 million rows. The connection pool saturated at 02:17, checkout requests began timing out, and the error budget for the quarter evaporated in two hours.

What went well: alerts fired within four minutes of impact, the on-call responded before the first customer tweet landed, and the decision to trigger the migration rollback at 02:41 was fast and correct. The postmortem culture showed up too — the room was blameless, and everyone with a hypothesis got heard.

What went poorly: the migration ran against production during a low-traffic window that turned out to be higher than historical dashboards suggested. Replica lag alerts existed but were routed to a quiet Slack channel nobody owns. And our runbook for 'checkout down' assumed a single root cause; engineers lost twenty minutes confirming the database theory while a feature flag that would have shed traffic sat unflipped.

Contributing factors were systemic rather than individual. Capacity planning modeled customer growth but not migration load. The pre-migration checklist lacked a rollback rehearsal. And our synthetic checkout probes ran every five minutes from a single region, missing the EU-specific path entirely for two crucial minutes.

Action items, in order of urgency: one, add migration load models to the capacity process by November 15. Two, page the correct rotation when replica lag exceeds thirty seconds, and delete the orphaned Slack channel. Three, rehearse rollbacks quarterly, including with a deliberately broken migration in staging. Four, add multi-region synthetic probes covering the EU path. Five, add the feature-flag shed to the incident checklist as step zero.

Aurora hurt, and it was also the clearest reminder this year of why we build in public, document failures honestly, and fix systems instead of blaming people. The carts come back. The reliability discipline has to.`,
  },
];

export function sanitizeFilename(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return base || 'document';
}
