# Implementation Instructions

## Objective
Implement Phase 1 end-to-end:
- repository
- environment
- schema
- ingestion
- normalization
- provenance
- confidence
- tests
- documentation

Only after Phase 1 is complete may you begin the platform/dashboard.

## Implementation Order

### Step 1
Create repository structure.

### Step 2
Set up environment, dependencies, linting, formatting, and test framework.

### Step 3
Implement configuration and secrets handling.

### Step 4
Implement database schema and migrations.

### Step 5
Implement source catalog and source configuration.

### Step 6
Implement fetchers and raw snapshot storage.

### Step 7
Implement parsers and staging models.

### Step 8
Implement normalization and entity resolution.

### Step 9
Implement provenance and confidence capture.

### Step 10
Implement tests and validation checks.

### Step 11
Seed the first data sources.

### Step 12
Generate documentation and runbooks.

### Step 13
Only if Phase 1 passes, scaffold Phase 2.

## Suggested Repository Structure

project-root/
  docs/
  research/
  src/
    app/
    core/
    db/
    models/
    sources/
      base/
      official_brazil/
      international/
    pipelines/
    services/
    cli/
    utils/
  tests/
    unit/
    integration/
    fixtures/
  data/
    raw/
    staged/
    exports/
  migrations/
  scripts/
  .env.example
  docker-compose.yml
  README.md

## Required Modules

### Source Catalog
A structured registry of known sources with fields such as:
- id
- name
- url
- owner
- source_type
- authority_tier
- access_method
- parser_module
- active_flag
- legal_notes

### Fetcher Layer
Implement reusable fetchers that:
- identify source
- log request metadata
- store raw snapshots
- handle retries
- detect content type
- timestamp collection
- preserve response metadata where legal and useful

### Parser Layer
Implement source-specific parsers that:
- parse raw input into staging records
- preserve extracted text snippets where appropriate
- emit validation diagnostics
- do not directly write final production entities

### Normalization Layer
Convert staging records into canonical records.
Handle:
- normalized names
- aliases
- dates
- quantities
- statuses
- category mapping
- branch assignment
- source provenance linkage

### Entity Resolution Layer
Implement conservative resolution rules.
When uncertain:
- create alias entries
- lower confidence
- preserve ambiguity
- avoid aggressive merging

### Database Layer
Implement migrations and models.
Ensure:
- foreign keys
- uniqueness rules where appropriate
- many-to-many support for evidence relationships
- temporal history support
- soft conflict handling

## Required CLI Commands
Create commands such as:
- source list
- fetch source
- parse source
- ingest source
- run pipeline
- validate data
- export sample
- report conflicts

## Testing Requirements
Add tests for:
- source adapters
- parsing logic
- normalization logic
- confidence scoring
- migration integrity
- entity resolution edge cases
- idempotent reruns where feasible

## Minimum Viable Initial Ingestion Set
Aim first for:
- at least one official Brazilian source with structured or semi-structured asset information
- at least one official event-oriented source
- SIPRI as a complementary international transfer source if legally practical for the workflow

## Required Documentation
Write:
- setup guide
- source catalog guide
- ingestion guide
- schema guide
- provenance and confidence guide
- limitations and ethics guide
- update and maintenance runbook

## Definition of Done for Phase 1
Phase 1 is done when:
- database schema is implemented
- at least one meaningful ingestion pipeline works end-to-end
- evidence and confidence are stored
- data can be reloaded reproducibly
- tests pass
- documentation is sufficient for another engineer to run the system

## Phase 2 Trigger
Only after the user accepts the completed database foundation may you begin:
- API
- web application
- dashboard
- search UX
- charts and maps
