/**
 * Quick auth test — run with: node test_auth.js
 * Make sure the server is running on port 3001 first.
 */
async function main() {
    const BASE = 'http://localhost:3001';

    // Test 1: Health check
    try {
        const health = await fetch(`${BASE}/api/health`);
        const healthData = await health.json();
        console.log('[Health]', health.status, healthData.data?.status || 'error');
    } catch (e) {
        console.error('[Health] Server not reachable:', e.message);
        return;
    }

    // Test 2: Login attempt (will fail with 401 if no seed data — that's expected)
    try {
        const response = await fetch(`${BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@school.com',
                password: 'admin12345678',
                role: 'institute_admin',
            }),
        });
        const data = await response.json();
        console.log('[Login] Status:', response.status);
        console.log('[Login] Success:', data.success);
        if (data.data?.token) console.log('[Login] Token received ✓');
        if (data.error) console.log('[Login] Error:', data.error.message);
    } catch (e) {
        console.error('[Login] Fetch error:', e.message);
    }

    // Test 3: Registration
    try {
        const response = await fetch(`${BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Admin',
                email: `test_${Date.now()}@example.com`,
                password: 'TestPass123!',
                role: 'institute_admin',
                institute_name: 'Test Institute',
            }),
        });
        const data = await response.json();
        console.log('[Register] Status:', response.status);
        console.log('[Register] Success:', data.success);
        if (data.data?.user) console.log('[Register] User:', data.data.user.name, data.data.user.role);
    } catch (e) {
        console.error('[Register] Fetch error:', e.message);
    }
}

main();
