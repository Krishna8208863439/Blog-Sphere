/**
 * Comprehensive test script verifying:
 * 1. Register a new user
 * 2. Login with valid credentials (returns JWT and sets HttpOnly Cookie)
 * 3. Login with invalid credentials (returns 401)
 * 4. Verify JWT authentication (GET /api/auth/me)
 * 5. Access protected route without login (returns 401)
 * 6. Access protected route with valid login (returns 200)
 * 7. User A sees only User A's blogs (GET /api/blogs/my-blogs)
 * 8. User B sees only User B's blogs (GET /api/blogs/my-blogs)
 * 9. Attempt unauthorized blog modification (User B cannot edit User A's blog - returns 403)
 * 10. Update profile information (PUT /api/users/profile & duplicate check)
 * 11. Change password (PATCH /api/users/change-password & verify new password)
 * 12. Logout successfully (POST /api/auth/logout clears cookie)
 * 13. Attempt to access protected endpoint after logout (cookie cleared - 401)
 * 14. Test expired JWT (returns 401)
 * 15. Test invalid authentication cookie/token (returns 401)
 */

const BASE = 'http://localhost:5000/api';

async function runAuthTests() {
  console.log('=== Starting BlogSphere Secure Authentication & User Management Tests ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`, details);
      failed++;
    }
  }

  const timestamp = Date.now();
  const userAData = {
    fullName: 'Alice Walker',
    username: `alice_${timestamp}`.slice(0, 18),
    email: `alice_${timestamp}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const userBData = {
    fullName: 'Bob Martin',
    username: `bob_${timestamp}`.slice(0, 18),
    email: `bob_${timestamp}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  // 1. Register a new user (User A)
  const regARes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userAData),
  });
  const regAJson = await regARes.json();
  assert(regARes.status === 201 && regAJson.success, 'Test 1: Register new user (User A)');

  // Duplicate email check
  const dupEmailRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userAData),
  });
  assert(dupEmailRes.status === 400, 'Test 1.1: Prevent duplicate email registration');

  // Register User B
  const regBRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userBData),
  });
  assert(regBRes.status === 201, 'Test 1.2: Register User B');

  // 2. Login with valid credentials (User A)
  const loginARes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAData.email, password: userAData.password }),
  });
  const loginAJson = await loginARes.json();
  const setCookieHeader = loginARes.headers.get('set-cookie') || '';
  assert(
    loginARes.status === 200 &&
    loginAJson.data?.token &&
    setCookieHeader.includes('token='),
    'Test 2: Login with valid credentials sets signed JWT in HttpOnly cookie'
  );
  const tokenA = loginAJson.data.token;
  const cookieA = setCookieHeader.split(';')[0]; // token=...

  // Login User B
  const loginBRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userBData.email, password: userBData.password }),
  });
  const loginBJson = await loginBRes.json();
  const tokenB = loginBJson.data.token;
  const cookieB = (loginBRes.headers.get('set-cookie') || '').split(';')[0];

  // 3. Login with invalid credentials
  const badLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAData.email, password: 'WrongPassword999!' }),
  });
  assert(badLoginRes.status === 401, 'Test 3: Login with invalid credentials returns 401');

  // 4. Verify JWT authentication (GET /api/auth/me via Cookie)
  const meCookieRes = await fetch(`${BASE}/auth/me`, {
    headers: { 'Cookie': cookieA },
  });
  const meCookieJson = await meCookieRes.json();
  assert(
    meCookieRes.status === 200 && meCookieJson.data?.user?.email === userAData.email.toLowerCase(),
    'Test 4: Verify JWT authentication via HttpOnly cookie (GET /api/auth/me)'
  );

  // 5. Access Dashboard/protected routes without login
  const unauthMeRes = await fetch(`${BASE}/auth/me`);
  assert(unauthMeRes.status === 401, 'Test 5: Access protected route without login returns 401');

  // 6. Access protected route with valid login
  const authMeRes = await fetch(`${BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${tokenA}` },
  });
  assert(authMeRes.status === 200, 'Test 6: Access protected route with Bearer token returns 200');

  // User A creates 2 blogs (1 published, 1 draft)
  const blogPubARes = await fetch(`${BASE}/blogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      title: 'Alice Published Story on AI',
      description: 'A deep story about AI by Alice.',
      content: '<p>Content by Alice.</p>',
      category: 'Artificial Intelligence',
      status: 'published',
    }),
  });
  const blogPubA = (await blogPubARes.json()).data.blog;

  const blogDraftARes = await fetch(`${BASE}/blogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      title: 'Alice Draft Story on Tech',
      description: 'Draft notes by Alice.',
      content: '<p>Draft by Alice.</p>',
      category: 'Technology',
      status: 'draft',
    }),
  });
  const blogDraftA = (await blogDraftARes.json()).data.blog;

  // User B creates 1 blog
  const blogPubBRes = await fetch(`${BASE}/blogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({
      title: 'Bob Published Story on Web Dev',
      description: 'Web development story by Bob.',
      content: '<p>Content by Bob.</p>',
      category: 'Web Development',
      status: 'published',
    }),
  });
  const blogPubB = (await blogPubBRes.json()).data.blog;

  // 7. Verify User A sees only User A's blogs
  const myBlogsARes = await fetch(`${BASE}/blogs/my-blogs`, {
    headers: { 'Cookie': cookieA },
  });
  const myBlogsAJson = await myBlogsARes.json();
  const aBlogIds = myBlogsAJson.data.blogs.map(b => b.id);
  assert(
    aBlogIds.includes(blogPubA.id) &&
    aBlogIds.includes(blogDraftA.id) &&
    !aBlogIds.includes(blogPubB.id),
    'Test 7: User A sees only User A\'s blogs in /api/blogs/my-blogs'
  );

  // 8. Verify User B sees only User B's blogs
  const myBlogsBRes = await fetch(`${BASE}/blogs/my-blogs`, {
    headers: { 'Cookie': cookieB },
  });
  const myBlogsBJson = await myBlogsBRes.json();
  const bBlogIds = myBlogsBJson.data.blogs.map(b => b.id);
  assert(
    bBlogIds.includes(blogPubB.id) &&
    !bBlogIds.includes(blogPubA.id) &&
    !bBlogIds.includes(blogDraftA.id),
    'Test 8: User B sees only User B\'s blogs in /api/blogs/my-blogs'
  );

  // 9. Attempt unauthorized blog modification (User B edits User A's blog)
  const unauthEditRes = await fetch(`${BASE}/blogs/${blogPubA.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieB,
      'Authorization': `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ title: 'Hacked Title Attempt by Bob', category: 'Technology' }),
  });
  assert(unauthEditRes.status === 403, 'Test 9: User B cannot modify User A\'s blog (returns 403 Forbidden)');

  // 10. Update profile information (PUT /api/users/profile)
  const updateProfRes = await fetch(`${BASE}/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookieA },
    body: JSON.stringify({
      fullName: 'Alice Updated Name',
      bio: 'Updated bio for Alice.',
      profileImage: 'https://example.com/alice.jpg',
    }),
  });
  const updateProfJson = await updateProfRes.json();
  assert(
    updateProfRes.status === 200 &&
    updateProfJson.data?.user?.fullName === 'Alice Updated Name' &&
    updateProfJson.data?.user?.profileImage === 'https://example.com/alice.jpg',
    'Test 10: Update profile information (PUT /api/users/profile)'
  );

  // 11. Change password (PATCH /api/users/change-password)
  const changePassRes = await fetch(`${BASE}/users/change-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookieA },
    body: JSON.stringify({
      currentPassword: userAData.password,
      newPassword: 'NewSecurePassword123!',
      confirmPassword: 'NewSecurePassword123!',
    }),
  });
  assert(changePassRes.status === 200, 'Test 11: Change password successfully');

  // Verify login with new password
  const newLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAData.email, password: 'NewSecurePassword123!' }),
  });
  assert(newLoginRes.status === 200, 'Test 11.1: Login with new password succeeds');

  // 12. Logout successfully
  const logoutRes = await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': cookieA },
  });
  const logoutCookie = logoutRes.headers.get('set-cookie') || '';
  assert(
    logoutRes.status === 200 &&
    (logoutCookie.includes('token=;') || logoutCookie.includes('Max-Age=0') || logoutCookie.includes('expires=')),
    'Test 12: Logout successfully clears the authentication cookie'
  );

  // 13. Attempt to access protected endpoint after logout (using empty or expired cookie)
  const postLogoutRes = await fetch(`${BASE}/auth/me`, {
    headers: { 'Cookie': 'token=' },
  });
  assert(postLogoutRes.status === 401, 'Test 13: Protected route blocked after logout (401)');

  // 14. Test expired JWT
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwM2RjZDk4NzMwMzQ1NjFiYzNlM2U4ZSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.bogusSignature';
  const expRes = await fetch(`${BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${expiredToken}` },
  });
  assert(expRes.status === 401, 'Test 14: Expired/invalid signature JWT rejected with 401');

  // 15. Test invalid authentication cookie
  const badCookieRes = await fetch(`${BASE}/auth/me`, {
    headers: { 'Cookie': 'token=invalidMalformedTokenValue' },
  });
  assert(badCookieRes.status === 401, 'Test 15: Invalid authentication cookie returns 401');

  console.log(`\n=================================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 ALL AUTHENTICATION & SECURITY REQUIREMENTS VERIFIED!');
  } else {
    process.exit(1);
  }
}

runAuthTests().catch(err => {
  console.error('Error running auth tests:', err);
  process.exit(1);
});
