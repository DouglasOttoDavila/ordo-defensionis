# Execution Roadmap

## Goal
Deliver Phase 1 first, then Phase 2.

## Phase 1: Database Foundation

### Milestone 1: Research dossier
Outputs:
- source inventory
- legality and trust assessment
- MVP source recommendations
- data gap analysis
- LAI request templates

Exit criteria:
- at least one official source selected for ingestion
- at least one complementary source selected
- clear statement of known limitations

### Milestone 2: Architecture and schema plan
Outputs:
- architecture design
- schema proposal
- provenance model
- confidence model
- parser strategy
- test strategy

Exit criteria:
- schema is implementation-ready
- ingestion flow is documented
- risks are identified

### Milestone 3: Repo and environment
Outputs:
- project scaffold
- environment config
- dependency management
- local DB and migrations
- testing scaffold

Exit criteria:
- fresh setup works from zero
- migrations run successfully

### Milestone 4: First ingestion pipeline
Outputs:
- source catalog
- fetcher
- snapshot persistence
- parser
- staging records
- normalization
- provenance links

Exit criteria:
- one source runs end-to-end into DB

### Milestone 5: Confidence and conflict handling
Outputs:
- confidence rules
- contradiction handling
- conflict reporting
- data validation checks

Exit criteria:
- contradictory claims can coexist
- confidence is queryable

### Milestone 6: Documentation and reproducibility
Outputs:
- setup guide
- runbook
- schema guide
- source guide
- refresh instructions

Exit criteria:
- another engineer can run the system

## Phase 2: Platform and Dashboard

### Milestone 7: API layer
Only after Phase 1 acceptance.

### Milestone 8: Dashboard MVP
Only after API or query interface is stable.

### Milestone 9: Change tracking and evidence UI
Only after dashboard basics are working.

## Prioritization Rules
Always prioritize:
1. evidence
2. schema integrity
3. reproducibility
4. refreshability
5. usability

Never prioritize visual polish over data quality.
