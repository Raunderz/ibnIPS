// @ts-check

import assert from 'node:assert/strict';
import test from 'node:test';

import { isAllowedEmail, isHostedDomainAllowed } from '../lib/domain.js';

const DOMAIN = 'kiit.ac.in';

test('accepts real addresses on the allowed domain', () => {
  assert.equal(isAllowedEmail('student@kiit.ac.in', DOMAIN), true);
  assert.equal(isAllowedEmail('student123@kiit.ac.in', DOMAIN), true);
  assert.equal(isAllowedEmail('a.b.c@kiit.ac.in', DOMAIN), true);
});

test('rejects addresses on any other domain', () => {
  assert.equal(isAllowedEmail('someone@gmail.com', DOMAIN), false);
  assert.equal(isAllowedEmail('someone@kiit.ac.in.evil.test', DOMAIN), false);
});

test('rejects lookalike local parts and subdomain spoofing', () => {
  // A bare endsWith(domain) would wrongly allow all four of these.
  assert.equal(isAllowedEmail('student@notkiit.ac.in', DOMAIN), false);
  assert.equal(isAllowedEmail('student@evil-kiit.ac.in', DOMAIN), false);
  assert.equal(isAllowedEmail('student@xkiit.ac.in', DOMAIN), false);
  assert.equal(isAllowedEmail('student@sub.kiit.ac.in', DOMAIN), false);
});

test('rejects the domain appearing anywhere but the suffix', () => {
  assert.equal(isAllowedEmail('kiit.ac.in@evil.test', DOMAIN), false);
  assert.equal(isAllowedEmail('kiit.ac.in', DOMAIN), false);
  assert.equal(isAllowedEmail('', DOMAIN), false);
});

test('an empty allowed domain cannot match anything', () => {
  // Guards against a config typo turning the check into a no-op.
  assert.equal(isAllowedEmail('student@kiit.ac.in', ''), false);
  assert.equal(isAllowedEmail('student@', ''), true);
});

test('a missing hosted-domain claim is tolerated', () => {
  assert.equal(isHostedDomainAllowed(undefined, DOMAIN), true);
});

test('a matching hosted-domain claim is accepted, case-insensitively', () => {
  assert.equal(isHostedDomainAllowed('kiit.ac.in', DOMAIN), true);
  assert.equal(isHostedDomainAllowed('KIIT.AC.IN', DOMAIN), true);
});

test('a mismatched hosted-domain claim is rejected', () => {
  assert.equal(isHostedDomainAllowed('evil.test', DOMAIN), false);
  assert.equal(isHostedDomainAllowed('kiit.ac.in.evil.test', DOMAIN), false);
});
