import { describe, it, expect } from 'vitest';
import { firstIssue, loginSchema, registerSchema, taskFormSchema } from '../lib/validation';

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    expect(firstIssue(loginSchema, { email: 'a@b.com', password: 'x' })).toBeNull();
  });

  it('rejects a malformed email', () => {
    expect(firstIssue(loginSchema, { email: 'nope', password: 'x' })).toMatch(/email/i);
  });
});

describe('registerSchema', () => {
  const valid = {
    full_name: 'Tran Khoa',
    email: 'khoa@fastboard.dev',
    password: 'Password1',
    confirm: 'Password1',
  };

  it('accepts a valid registration', () => {
    expect(firstIssue(registerSchema, valid)).toBeNull();
  });

  it('enforces the password policy (uppercase + number + length)', () => {
    expect(firstIssue(registerSchema, { ...valid, password: 'short', confirm: 'short' })).toMatch(
      /8 characters/
    );
    expect(
      firstIssue(registerSchema, { ...valid, password: 'password1', confirm: 'password1' })
    ).toMatch(/uppercase/);
    expect(
      firstIssue(registerSchema, { ...valid, password: 'Passwordx', confirm: 'Passwordx' })
    ).toMatch(/number/);
  });

  it('rejects mismatched password confirmation', () => {
    expect(firstIssue(registerSchema, { ...valid, confirm: 'Password2' })).toMatch(/match/);
  });
});

describe('taskFormSchema', () => {
  it('requires a non-blank title', () => {
    expect(firstIssue(taskFormSchema, { title: '   ' })).toMatch(/required/i);
    expect(firstIssue(taskFormSchema, { title: 'Fix bug' })).toBeNull();
  });

  it('caps the title length at 500', () => {
    expect(firstIssue(taskFormSchema, { title: 'x'.repeat(501) })).toMatch(/too long/i);
  });
});
