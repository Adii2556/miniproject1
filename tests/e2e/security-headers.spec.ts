import { expect, test } from '@playwright/test'

const deploymentUrl = process.env.DEPLOYMENT_URL?.replace(/\/$/, '')

test.describe('staging security headers', () => {
  test.skip(!deploymentUrl, 'DEPLOYMENT_URL is required for deployment checks')

  test('sets the full browser security policy and hides repository files', async ({ request }) => {
    const response = await request.get(deploymentUrl!)
    expect(response.ok()).toBeTruthy()
    const headers = response.headers()

    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/)
    expect(headers['x-frame-options']?.toUpperCase()).toBe('DENY')
    expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff')
    expect(headers['referrer-policy']).toBeTruthy()
    expect(headers['permissions-policy']).toBeTruthy()
    expect(headers['cross-origin-opener-policy']?.toLowerCase()).toBe('same-origin')

    for (const path of ['/.git/config', '/package.json']) {
      const sensitive = await request.get(`${deploymentUrl}${path}`)
      const body = await sensitive.text()
      expect(body).not.toMatch(/repositoryformatversion|"scripts"\s*:|"dependencies"\s*:/i)
      expect(sensitive.headers()['content-type'] ?? '').not.toMatch(/application\/(?:json|octet-stream)/i)
    }
  })
})
