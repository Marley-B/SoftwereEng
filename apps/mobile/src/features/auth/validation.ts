const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Enter your email.";
  }
  if (!EMAIL_RE.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Enter your password.";
  }
  if (password.length < 8) {
    return "Use at least 8 characters.";
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Enter your name.";
  }
  if (trimmed.length < 2) {
    return "Use at least 2 characters.";
  }
  return null;
}
