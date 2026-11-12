# Transweb

Transweb is a rebranded and adapted distribution of [Fleetbase](https://github.com/fleetbase/fleetbase)
for logistics, deliveries and fleet management in Mozambique.

Fleetbase is copyright Fleetbase Pte. Ltd. and contributors and is licensed under the GNU Affero
General Public License v3.0 or later (see `LICENSE.md`). Transweb modifications are distributed under
the same licence.

## Obligations kept in this distribution

- Upstream copyright notices and `LICENSE.md` are untouched.
- The console footer shows only the Transweb copyright and a **Legal notices** button (since 2026-11-11
  there is no "Powered by Fleetbase" or source-code link in the footer itself). That dialog
  (`console/app/components/modals/fleetbase-legal-notice.*`) must keep both:
  - the **source code link** of this modified version (AGPL-3.0 §13: users interacting with Transweb
    over a network must be offered the corresponding source), and
  - Fleetbase's **copyright and licence notices** (AGPL-3.0 §5 "Appropriate Legal Notices").
- Source of this distribution: **https://github.com/fjessen/transweb** (branch `transweb`), linked
  from that dialog via `TRANSWEB_SOURCE_URL`. Keep what you deploy pushed there.

If you want to hide the upstream credit or keep modifications private, that requires a Fleetbase
commercial licence; it is not something this distribution changes.
