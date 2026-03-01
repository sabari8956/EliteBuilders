import { getStore } from "./store";

export function resetStoreForTests(): void {
  const store = getStore();
  store.counters.user = 0;
  store.counters.challenge = 0;
  store.counters.submission = 0;
  store.counters.session = 0;
  store.users.clear();
  store.usersByGithub.clear();
  store.sessions.clear();
  store.challenges.clear();
  store.submissions.clear();
  store.audits.length = 0;
}
