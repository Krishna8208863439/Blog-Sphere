/**
 * profile.js — Handles the standalone Profile page functionality.
 * Interacts with /api/users/profile, /api/users/change-password, and /api/blogs/stats
 */
'use strict';

async function initProfilePage() {
  // Backend session check with GET /api/auth/me
  const user = await BlogStore.refreshCurrentUser();
  if (!user) {
    const next = window.location.pathname.split('/').pop()
      + window.location.search
      + window.location.hash;
    window.location.replace(`login.html?next=${encodeURIComponent(next)}`);
    return;
  }

  // Render and bind sidebar
  if (typeof renderSidebar === 'function') {
    renderSidebar('profile');
    bindSidebar();
    setTopbar('profile');
  }

  const profileForm  = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');

  // Member card elements
  const profileAvatar = document.getElementById('profile-avatar');
  const profileName   = document.getElementById('profile-name');
  const profileHandle = document.getElementById('profile-handle');
  const profileBio    = document.getElementById('profile-bio-display');
  const profileEmail  = document.getElementById('profile-email-display');
  const memberSince   = document.getElementById('member-since');

  // Stats elements
  const statTotal     = document.getElementById('profile-stat-total');
  const statPublished = document.getElementById('profile-stat-published');
  const statDraft     = document.getElementById('profile-stat-draft');

  function updateDisplay(u) {
    if (profileAvatar) {
      if (u.profileImage) {
        profileAvatar.innerHTML = `<img src="${BlogUI.escapeHtml(u.profileImage)}" alt="${BlogUI.escapeHtml(u.fullName)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        profileAvatar.textContent = BlogUI.initial(u.fullName);
      }
    }
    if (profileName)   profileName.textContent   = u.fullName;
    if (profileHandle) profileHandle.textContent = `@${u.username}`;
    if (profileBio)    profileBio.textContent    = u.bio || '';
    if (profileEmail)  profileEmail.innerHTML    = `<i class="fa-regular fa-envelope" aria-hidden="true"></i> ${BlogUI.escapeHtml(u.email)}`;
    if (memberSince)   memberSince.innerHTML     = `<i class="fa-regular fa-calendar" aria-hidden="true"></i> Member since ${BlogUI.formatDate(u.createdAt)}`;

    profileForm.elements.fullName.value     = u.fullName || '';
    profileForm.elements.username.value     = u.username || '';
    profileForm.elements.email.value        = u.email || '';
    profileForm.elements.bio.value          = u.bio || '';
    profileForm.elements.profileImage.value = u.profileImage || '';
  }

  updateDisplay(user);

  // Fetch actual blog counts from MongoDB
  async function loadBlogStats() {
    try {
      const stats = await BlogStore.getStats();
      if (statTotal)     statTotal.textContent     = String(stats.total || 0);
      if (statPublished) statPublished.textContent = String(stats.published || 0);
      if (statDraft)     statDraft.textContent     = String(stats.drafts || 0);
    } catch (_) {}
  }
  loadBlogStats();

  // Profile Form submit
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    BlogUI.clearFieldErrors(profileForm);

    const fullName     = profileForm.elements.fullName.value.trim();
    const username     = profileForm.elements.username.value.trim();
    const email        = profileForm.elements.email.value.trim();
    const bio          = profileForm.elements.bio.value.trim();
    const profileImage = profileForm.elements.profileImage.value.trim();

    let invalid = false;
    if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(fullName)) {
      BlogUI.setFieldError(profileForm, 'fullName', 'Use letters, spaces, hyphens, or apostrophes (2–60 characters).');
      invalid = true;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      BlogUI.setFieldError(profileForm, 'username', 'Use 3–20 letters, numbers, or underscores.');
      invalid = true;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      BlogUI.setFieldError(profileForm, 'email', 'Enter a valid email address.');
      invalid = true;
    }
    if (bio.length > 280) {
      BlogUI.setFieldError(profileForm, 'bio', 'Keep the bio under 280 characters.');
      invalid = true;
    }
    if (invalid) {
      BlogUI.focusFirstInvalid(profileForm);
      return;
    }

    const btn = profileForm.querySelector('[type="submit"]');
    BlogUI.setBusy(btn, true, 'Saving…');

    const result = await BlogStore.updateUser(user.id, {
      fullName,
      username,
      email,
      bio,
      profileImage,
    });
    BlogUI.setBusy(btn, false, 'Save Changes');

    if (!result.ok) {
      BlogUI.setFieldError(profileForm, result.field || 'username', result.message);
      BlogUI.toast(result.message || 'Failed to update profile.', 'error');
      return;
    }

    updateDisplay(result.user);
    // Update sidebar if present
    const sideName = document.getElementById('user-name');
    const sideHandle = document.getElementById('user-handle');
    const sideAvatar = document.getElementById('user-avatar');
    if (sideName) sideName.textContent = result.user.fullName;
    if (sideHandle) sideHandle.textContent = `@${result.user.username}`;
    if (sideAvatar) sideAvatar.textContent = BlogUI.initial(result.user.fullName);

    BlogUI.toast('Profile updated successfully.', 'success');
  });

  // Password Form submit
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    BlogUI.clearFieldErrors(passwordForm);

    const current = passwordForm.elements.currentPassword.value;
    const next    = passwordForm.elements.newPassword.value;
    const confirm = passwordForm.elements.confirmPassword.value;

    let invalid = false;
    if (!current) {
      BlogUI.setFieldError(passwordForm, 'currentPassword', 'Enter your current password.');
      invalid = true;
    }
    if (next.length < 8 || next.length > 72 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      BlogUI.setFieldError(passwordForm, 'newPassword', 'Use 8–72 characters with at least one letter and one number.');
      invalid = true;
    }
    if (next !== confirm) {
      BlogUI.setFieldError(passwordForm, 'confirmPassword', 'Passwords do not match.');
      invalid = true;
    }
    if (invalid) {
      BlogUI.focusFirstInvalid(passwordForm);
      return;
    }

    const btn = passwordForm.querySelector('[type="submit"]');
    BlogUI.setBusy(btn, true, 'Updating…');

    const result = await BlogStore.updateUser(user.id, {
      currentPassword: current,
      password: next,
    });
    BlogUI.setBusy(btn, false, 'Update Password');

    if (!result.ok) {
      BlogUI.setFieldError(passwordForm, result.field || 'currentPassword', result.message);
      BlogUI.toast(result.message || 'Failed to update password.', 'error');
      return;
    }

    passwordForm.reset();
    BlogUI.toast('Password updated successfully.', 'success');
  });
}

BlogApp.register('profile', initProfilePage);
