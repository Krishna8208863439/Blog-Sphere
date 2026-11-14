/**
 * Registration, sign-in, and password reset.
 */
'use strict';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{1,59}$/;

function passwordProblem(password) {
  if (!password) return 'Enter a password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 72) return 'Use 72 characters or fewer.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Include at least one letter and one number.';
  }
  return '';
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'good';
  return 'strong';
}

function initLogin() {
  if (BlogStore.currentUser()) {
    window.location.replace('dashboard.html');
    return;
  }

  const form = document.getElementById('login-form');
  const alert = document.getElementById('login-alert');
  const resetPanel = document.getElementById('reset-panel');
  const loginPanel = document.getElementById('login-panel');
  const params = new URLSearchParams(window.location.search);
  if (params.get('email')) form.elements.email.value = params.get('email');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    BlogUI.clearFieldErrors(form);
    BlogUI.showAlert(alert, '');
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const remember = form.elements.remember.checked;
    let invalid = false;
    if (!EMAIL_PATTERN.test(email)) {
      BlogUI.setFieldError(form, 'email', 'Enter a valid email address.');
      invalid = true;
    }
    if (!password) {
      BlogUI.setFieldError(form, 'password', 'Enter your password.');
      invalid = true;
    }
    if (invalid) {
      BlogUI.focusFirstInvalid(form);
      return;
    }

    const button = form.querySelector('[type="submit"]');
    BlogUI.setBusy(button, true, 'Signing in');

    // authenticate() is now async (calls POST /api/auth/login)
    const user = await BlogStore.authenticate(email, password, remember);
    if (!user) {
      BlogUI.setBusy(button, false, 'Sign in');
      BlogUI.showAlert(alert, 'Email or password is incorrect.');
      BlogUI.setFieldError(form, 'password', 'Check your password and try again.');
      form.elements.password.focus();
      return;
    }

    BlogUI.flash(`Welcome back, ${BlogUI.firstName(user.fullName)}.`);
    window.location.href = BlogUI.safeNext(params.get('next'));
  });

  document.getElementById('demo-login').addEventListener('click', async () => {
    form.elements.email.value = 'demo@blogsphere.com';
    form.elements.password.value = 'Demo1234!';
    form.elements.remember.checked = true;
    // trigger async submit
    form.elements.email.dispatchEvent(new Event('input'));
    const button = form.querySelector('[type="submit"]');
    BlogUI.setBusy(button, true, 'Signing in');
    const user = await BlogStore.authenticate('demo@blogsphere.com', 'Demo1234!', true);
    if (!user) {
      BlogUI.setBusy(button, false, 'Sign in');
      BlogUI.showAlert(alert, 'Demo account not found. Please register first.');
      return;
    }
    BlogUI.flash(`Welcome back, ${BlogUI.firstName(user.fullName)}.`);
    window.location.href = BlogUI.safeNext(params.get('next'));
  });

  document.getElementById('forgot-open').addEventListener('click', () => {
    loginPanel.hidden = true;
    resetPanel.hidden = false;
    document.getElementById('reset-email').focus();
  });

  document.querySelectorAll('[data-back-login]').forEach((button) => {
    button.addEventListener('click', () => {
      resetPanel.hidden = true;
      loginPanel.hidden = false;
      document.getElementById('reset-confirm').hidden = true;
      document.getElementById('reset-request').hidden = false;
    });
  });

  const requestForm = document.getElementById('reset-request');
  const confirmForm = document.getElementById('reset-confirm');
  let resetEmail = '';

  requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    BlogUI.clearFieldErrors(requestForm);
    const email = requestForm.elements.email.value.trim();
    if (!EMAIL_PATTERN.test(email)) {
      BlogUI.setFieldError(requestForm, 'email', 'Enter the email on your account.');
      return;
    }
    // check-email is async now
    const exists = await accountExists(email);
    if (!exists) {
      BlogUI.setFieldError(requestForm, 'email', 'We could not find an account with that email.');
      return;
    }
    resetEmail = email;
    requestForm.hidden = true;
    confirmForm.hidden = false;
    confirmForm.elements.password.focus();
  });

  confirmForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    BlogUI.clearFieldErrors(confirmForm);
    const password = confirmForm.elements.password.value;
    const confirm = confirmForm.elements.confirmPassword.value;
    const problem = passwordProblem(password);
    if (problem) {
      BlogUI.setFieldError(confirmForm, 'password', problem);
      return;
    }
    if (password !== confirm) {
      BlogUI.setFieldError(confirmForm, 'confirmPassword', 'Passwords do not match.');
      return;
    }
    const saved = await BlogStore.setPasswordByEmail(resetEmail, password);
    if (!saved) {
      BlogUI.setFieldError(confirmForm, 'password', 'That account is no longer available.');
      return;
    }
    confirmForm.reset();
    confirmForm.hidden = true;
    requestForm.hidden = false;
    requestForm.reset();
    resetPanel.hidden = true;
    loginPanel.hidden = false;
    form.elements.email.value = resetEmail;
    form.elements.password.value = '';
    BlogUI.toast('Password updated. You can sign in now.', 'success');
    form.elements.password.focus();
  });
}

function accountExists(email) {
  // Now async — calls POST /api/auth/check-email
  return lookupStoredEmail(email.trim().toLowerCase());
}

async function lookupStoredEmail(email) {
  try {
    const res = await fetch('http://localhost:5000/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    return json.success && json.data && json.data.exists;
  } catch (error) {
    // Fall back to localStorage check if server is unreachable
    try {
      const users = JSON.parse(localStorage.getItem('blogsphere_users') || '[]');
      return users.some((user) => user.email === email);
    } catch (_) {
      return false;
    }
  }
}

function initRegister() {
  if (BlogStore.currentUser()) {
    window.location.replace('dashboard.html');
    return;
  }

  const form = document.getElementById('register-form');
  const alert = document.getElementById('register-alert');
  const meter = document.getElementById('strength-meter');
  const strengthLabel = document.getElementById('strength-label');

  form.elements.password.addEventListener('input', () => {
    const value = form.elements.password.value;
    const strength = value ? passwordStrength(value) : '';
    meter.dataset.strength = strength;
    const labels = { weak: 'Weak password', good: 'Good password', strong: 'Strong password' };
    strengthLabel.textContent = labels[strength] || 'Use 8 or more characters with a letter and a number.';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    BlogUI.clearFieldErrors(form);
    BlogUI.showAlert(alert, '');

    const fullName = form.elements.fullName.value.trim();
    const email = form.elements.email.value.trim();
    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    const confirmPassword = form.elements.confirmPassword.value;
    let invalid = false;

    if (!NAME_PATTERN.test(fullName)) {
      BlogUI.setFieldError(form, 'fullName', 'Enter your name using letters, spaces, hyphens, or apostrophes.');
      invalid = true;
    }
    if (!EMAIL_PATTERN.test(email)) {
      BlogUI.setFieldError(form, 'email', 'Enter a valid email address.');
      invalid = true;
    }
    if (!USERNAME_PATTERN.test(username)) {
      BlogUI.setFieldError(form, 'username', 'Use 3–20 letters, numbers, or underscores.');
      invalid = true;
    }
    const problem = passwordProblem(password);
    if (problem) {
      BlogUI.setFieldError(form, 'password', problem);
      invalid = true;
    }
    if (password !== confirmPassword) {
      BlogUI.setFieldError(form, 'confirmPassword', 'Passwords do not match.');
      invalid = true;
    }
    if (invalid) {
      BlogUI.focusFirstInvalid(form);
      return;
    }

    const button = form.querySelector('[type="submit"]');
    BlogUI.setBusy(button, true, 'Creating account');

    let result;
    try {
      result = await BlogStore.createUser({ fullName, email, username, password });
    } catch (error) {
      BlogUI.setBusy(button, false, 'Create account');
      BlogUI.showAlert(alert, error.message || 'The account could not be saved.');
      return;
    }
    if (!result.ok) {
      BlogUI.setBusy(button, false, 'Create account');
      BlogUI.setFieldError(form, result.field || 'email', result.message);
      BlogUI.showAlert(alert, result.message);
      BlogUI.focusFirstInvalid(form);
      return;
    }

    BlogUI.flash('Account created. Sign in with your new email and password.');
    window.location.href = `login.html?email=${encodeURIComponent(result.user.email)}`;
  });
}

BlogApp.register('login', initLogin);
BlogApp.register('register', initRegister);
