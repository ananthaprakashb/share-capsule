# Daily content publisher failure isolation

The daily news publisher treats current-news retrieval and source validation as external dependencies.

- News providers are retried and alternate RSS feeds are used.
- Each endpoint is validated independently.
- A temporarily inaccessible source leaves that endpoint's previous verified selection unchanged.
- Other endpoints can still publish.
- The workflow exits successfully after logging published and skipped endpoint counts.
