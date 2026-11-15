/**
 * Test script to verify all 18 requirements against live backend & MongoDB.
 */
const BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Comprehensive BlogSphere Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, details);
      failed++;
    }
  }

  // 0. Login as demo user
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@blogsphere.com', password: 'Demo1234!' }),
  });
  const loginData = await loginRes.json();
  assert(loginData.success && loginData.data?.token, 'Auth login as demo user');
  const token = loginData.data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Register another test user for ownership & unauthorized edit/delete tests
  const secondEmail = `testuser_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Second Author',
      email: secondEmail,
      username: `user_${Date.now()}`.slice(0, 18),
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });
  const regData = await regRes.json();
  assert(regData.success, 'Register second user for unauthorized test');

  // Log in as second user to get token
  const secondLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: secondEmail, password: 'Password123!' }),
  });
  const secondLoginData = await secondLoginRes.json();
  const secondToken = secondLoginData.data.token;
  const secondHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${secondToken}`,
  };

  // Scenario 1: Create a new blog (published)
  const createPubRes = await fetch(`${BASE}/blogs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Full Stack Modern Web Apps with Node and MongoDB',
      description: 'Building modern responsive web applications from scratch with Express and Mongo.',
      content: '<p>Complete guide to modern web development using Express, MongoDB and Vanilla JS.</p>',
      category: 'Web Development',
      status: 'published',
    }),
  });
  const createPubData = await createPubRes.json();
  assert(createPubData.success && createPubData.data.blog.status === 'published', 'Scenario 1 & 3: Create and publish blog');
  const pubBlogId = createPubData.data.blog.id;

  // Scenario 2: Save a blog as draft
  const createDraftRes = await fetch(`${BASE}/blogs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Upcoming Trends in Artificial Intelligence and Neural Models',
      description: 'A deep look into how neural networks and AI models evolve.',
      content: '<p>Drafting insights regarding the upcoming advancements in AI technology.</p>',
      category: 'Artificial Intelligence',
      status: 'draft',
    }),
  });
  const createDraftData = await createDraftRes.json();
  assert(createDraftData.success && createDraftData.data.blog.status === 'draft', 'Scenario 2: Save blog as draft');
  const draftBlogId = createDraftData.data.blog.id;

  // Scenario 4: Retrieve all published blogs
  const getPubRes = await fetch(`${BASE}/blogs`);
  const getPubData = await getPubRes.json();
  assert(
    getPubData.success && Array.isArray(getPubData.data.blogs) && getPubData.data.blogs.some(b => b.id === pubBlogId),
    'Scenario 4: Retrieve all published blogs'
  );

  // Scenario 5: Open individual blog details
  const getDetailRes = await fetch(`${BASE}/blogs/${pubBlogId}`);
  const getDetailData = await getDetailRes.json();
  assert(getDetailData.success && getDetailData.data.blog.title === 'Full Stack Modern Web Apps with Node and MongoDB', 'Scenario 5: Open individual blog details');

  // Scenario 6 & 7: Edit existing blog and verify updated in MongoDB
  const updateRes = await fetch(`${BASE}/blogs/${pubBlogId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Updated Full Stack Modern Web Apps',
      description: 'Updated description for testing full CRUD operations.',
      content: '<p>Updated content successfully verified in MongoDB.</p>',
      category: 'Web Development',
      status: 'published',
    }),
  });
  const updateData = await updateRes.json();
  assert(updateData.success && updateData.data.blog.title === 'Updated Full Stack Modern Web Apps', 'Scenario 6: Edit existing blog');

  const verifyUpdateRes = await fetch(`${BASE}/blogs/${pubBlogId}`);
  const verifyUpdateData = await verifyUpdateRes.json();
  assert(verifyUpdateData.data.blog.description === 'Updated description for testing full CRUD operations.', 'Scenario 7: Verify updated data in MongoDB');

  // Scenario 8 & 9: Delete a blog and verify deletion in MongoDB
  const deleteRes = await fetch(`${BASE}/blogs/${draftBlogId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteData = await deleteRes.json();
  assert(deleteData.success, 'Scenario 8: Delete a blog');

  const verifyDeleteRes = await fetch(`${BASE}/blogs/${draftBlogId}`, { headers: authHeaders });
  assert(verifyDeleteRes.status === 404, 'Scenario 9: Verify deletion in MongoDB (404 received)');

  // Scenario 10: Search blogs by title
  const searchTitleRes = await fetch(`${BASE}/blogs?search=Modern%20Web%20Apps`);
  const searchTitleData = await searchTitleRes.json();
  assert(searchTitleData.success && searchTitleData.data.blogs.length > 0, 'Scenario 10: Search blogs by title');

  // Scenario 11: Search blogs by description
  const searchDescRes = await fetch(`${BASE}/blogs?search=testing%20full%20CRUD`);
  const searchDescData = await searchDescRes.json();
  assert(searchDescData.success && searchDescData.data.blogs.length > 0, 'Scenario 11: Search blogs by description');

  // Scenario 12: Filter blogs by category
  const filterCatRes = await fetch(`${BASE}/blogs?category=Web%20Development`);
  const filterCatData = await filterCatRes.json();
  assert(filterCatData.success && filterCatData.data.blogs.every(b => b.category === 'Web Development'), 'Scenario 12: Filter blogs by category');

  // Scenario 13: Combine search and category filters
  const combRes = await fetch(`${BASE}/blogs?search=Modern&category=Web%20Development`);
  const combData = await combRes.json();
  assert(combData.success && combData.data.blogs.length > 0 && combData.data.blogs[0].category === 'Web Development', 'Scenario 13: Combine search and category filters');

  // Scenario 14: Test pagination
  const page1Res = await fetch(`${BASE}/blogs?page=1&limit=2`);
  const page1Data = await page1Res.json();
  const page2Res = await fetch(`${BASE}/blogs?page=2&limit=2`);
  const page2Data = await page2Res.json();
  assert(
    page1Data.success && page2Data.success && page1Data.data.blogs.length > 0 && page2Data.data.blogs.length > 0 && page1Data.data.blogs[0].id !== page2Data.data.blogs[0].id,
    'Scenario 14: Test pagination (page 1 and page 2 return different slices)'
  );

  // Scenario 15: Test unauthorized editing (Second user edits demo user's blog)
  const unauthEditRes = await fetch(`${BASE}/blogs/${pubBlogId}`, {
    method: 'PUT',
    headers: secondHeaders,
    body: JSON.stringify({
      title: 'Hacked Title Attempt',
      category: 'Technology',
    }),
  });
  assert(unauthEditRes.status === 403, 'Scenario 15: Test unauthorized editing returns 403 Forbidden');

  // Scenario 16: Test unauthorized deletion (Second user deletes demo user's blog)
  const unauthDelRes = await fetch(`${BASE}/blogs/${pubBlogId}`, {
    method: 'DELETE',
    headers: secondHeaders,
  });
  assert(unauthDelRes.status === 403, 'Scenario 16: Test unauthorized deletion returns 403 Forbidden');

  // Scenario 17: Test empty search results
  const emptyRes = await fetch(`${BASE}/blogs?search=NonExistentKeywordXYZ98741`);
  const emptyData = await emptyRes.json();
  assert(emptyData.success && emptyData.data.blogs.length === 0, 'Scenario 17: Test empty search results');

  // Clean up: delete test pubBlogId
  await fetch(`${BASE}/blogs/${pubBlogId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });

  console.log(`\n--- Test Summary: ${passed} passed, ${failed} failed ---`);
  if (failed === 0) {
    console.log('🎉 ALL REST API AND CRUD SCENARIOS PASSED!');
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
