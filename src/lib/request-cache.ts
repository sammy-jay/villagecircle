import * as React from "react";

/**
 * Remember a server read for the length of one request (React `cache`), so the loaders on a page that need the same
 * row share one database round trip instead of each fetching it. Arguments are compared by value for strings,
 * numbers and booleans, so pass those, not objects. Outside a request (scripts, tests) it simply calls through.
 */
export const perRequest = ((React as unknown as { cache?: <F extends (...a: never[]) => unknown>(fn: F) => F }).cache
  ?? (<F,>(fn: F) => fn)) as <F extends (...a: never[]) => unknown>(fn: F) => F;
