/**
 * Auth helpers for API tests.
 *
 * In development/test, Clerk auth is bypassed via the x-test-user-id header.
 * The API routes check this header when NODE_ENV !== "production".
 */

export const TEST_USER_ID = "user_test_12345678";

/** Returns headers with test user ID for API tests. */
export function authHeaders(userId = TEST_USER_ID) {
  return {
    headers: {
      "x-test-user-id": userId,
    },
  };
}
