# Security

## Supported version

Security fixes are applied to the latest version on the `main` branch.

## Data handling

- Groq API keys are held in tab memory and are never written to browser storage or included in the production bundle.
- Uploaded files are parsed locally. Bounded document text is sent directly to Groq only after the user requests analysis or asks a question.
- Document history exists only for the lifetime of the current tab.
- The application does not use session replay or product telemetry.

## Reporting a vulnerability

Please report vulnerabilities privately through the repository’s GitHub Security Advisory form. Do not include API keys, uploaded documents, or other sensitive data in a public issue.

## Deployment requirements

Deploy over HTTPS and preserve the security headers defined in `public/_headers` or `vercel.json`. After deployment, verify the Content Security Policy, anti-framing, opener isolation, MIME sniffing protection, referrer policy, permissions policy, and HSTS headers from the public URL.
