// @ts-check

/**
 * Tenant isolation for KIIT accounts.
 *
 * Kept free of config and network dependencies so the rule that decides who
 * may authenticate can be tested directly.
 */

/**
 * Does this verified Google email belong to the allowed domain?
 *
 * The check is anchored on "@" rather than the bare domain so that a lookalike
 * such as "student@notkiit.ac.in" or "attacker@evil.kiit.ac.in.attacker.test"
 * cannot slip through a plain `endsWith` on the domain string.
 *
 * @param {string} email Already lowercased by the caller.
 * @param {string} allowedDomain Bare domain, lowercased, e.g. "kiit.ac.in".
 * @returns {boolean}
 */
export function isAllowedEmail(email, allowedDomain) {
  return email.endsWith(`@${allowedDomain}`);
}

/**
 * Validate a Google Workspace hosted-domain claim (`hd`) when present.
 *
 * `hd` is optional, so a missing value is not a failure here; the email suffix
 * check above is the authoritative gate. When Google does supply it, it must
 * agree with the allowed domain.
 *
 * @param {string | undefined} hostedDomain
 * @param {string} allowedDomain
 * @returns {boolean}
 */
export function isHostedDomainAllowed(hostedDomain, allowedDomain) {
  if (!hostedDomain) {
    return true;
  }

  return hostedDomain.toLowerCase() === allowedDomain;
}
