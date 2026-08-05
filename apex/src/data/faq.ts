/**
 * FAQ content. Single source for both the visible accordion and the FAQPage
 * JSON-LD in the head — the two must never drift, or structured-data
 * validation fails.
 */
export interface FaqEntry {
  question: string;
  answer: string;
  /** Optional follow-up link rendered after the answer (visible accordion
   *  only — JSON-LD carries the plain answer text). */
  link?: { href: string; label: string };
}

export const faq: FaqEntry[] = [
  {
    question: "What is a CTF platform?",
    answer:
      "A CTF (capture-the-flag) platform is the software that runs a security competition: it publishes challenges, accepts and validates flag submissions, keeps score in real time, and gives organisers the tools to manage teams, hints and support. Flagpost is a modern, open-source CTF platform you host yourself.",
  },
  {
    question: "Is Flagpost free?",
    answer:
      "Yes. Flagpost is open source under the AGPL-3.0 licence. There is no hosted tier, no feature gate and no telemetry — you run it on your own infrastructure and your competition data stays yours.",
  },
  {
    question: "Is Flagpost an alternative to CTFd?",
    answer:
      "Yes — Flagpost is a modern, open-source CTFd alternative, built for organisers who want real-time operations, a visual automation engine, and many competitions on one install. It reads CTFd's ctfcli challenge format, so trying it with your existing challenges takes minutes, and the docs carry a full, honest feature-by-feature comparison.",
    link: {
      href: "https://docs.flagpost.io/start/flagpost-vs-ctfd/",
      label: "Read the Flagpost vs CTFd comparison",
    },
  },
  {
    question: "Can I import my competition from CTFd?",
    answer:
      "Yes. Flagpost bulk-imports and exports challenges in the ctfcli YAML format used by CTFd, so an existing challenge repository drops straight in. There is also a one-click, full-fidelity platform backup for exporting or importing an entire install.",
  },
  {
    question: "What do I need to self-host Flagpost?",
    answer:
      "Docker with Compose on a single machine. One command starts the app, PostgreSQL, Redis, MinIO and a Caddy reverse proxy; point it at your domain and HTTPS certificates are obtained and renewed automatically.",
  },
  {
    question: "Does it support team and individual competitions?",
    answer:
      "Both, chosen per competition: team mode with invite codes, optional captain approval and size caps, or individual mode with a personal roster. A single install is multi-tenant and can run many competitions, public or private.",
  },
  {
    question: "Is the scoreboard really real-time?",
    answer:
      "Yes — standings, first-blood markers, presence and notifications stream over WebSockets rather than polling. There is a public spectator board with a full-screen venue mode for projectors — rotating the board, insights and timeline, with first-blood splashes — plus brackets for parallel divisions, a scoreboard freeze for the final stretch, and a CTFtime-compatible feed for rated events.",
  },
];
