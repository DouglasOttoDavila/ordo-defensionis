# Planning Instructions

## Objective
Convert research findings into a production-ready plan for Phase 1: database generation and ingestion foundation.

## Planning Deliverables
The planning phase must produce:
- technical architecture
- repository architecture
- normalized data model
- ingestion strategy per source
- provenance framework
- confidence framework
- validation strategy
- implementation roadmap
- risk register
- acceptance criteria

## Recommended Baseline Stack
Default recommendation unless research proves otherwise:
- Python
- PostgreSQL
- Alembic
- SQLAlchemy
- Pydantic
- requests or httpx
- BeautifulSoup or lxml
- pandas where useful
- Typer or argparse
- pytest
- Docker for local reproducibility
- optional FastAPI reserved for later API phase

## Target Architecture
Design a layered system with:
- raw source capture
- staging parsers
- normalization layer
- relational serving schema
- quality checks
- export layer for future dashboard/API

## Data Pipeline Model
Use this flow:
- discover
- fetch
- snapshot
- parse
- validate
- normalize
- resolve entities
- attach evidence
- score confidence
- load
- test
- report

## Mandatory Database Capabilities
The database must support:
- multiple branches
- categories and subcategories
- platforms and variants
- named assets when publicly known
- operators
- manufacturers
- countries
- procurement and modernization events
- source documents
- extracted claims
- contradictory claims
- evidence snapshots
- refresh runs
- confidence metadata

## Proposed Core Entities
At minimum plan for:
- branches
- organizations
- asset_categories
- platforms
- platform_variants
- assets
- manufacturers
- countries
- sources
- source_snapshots
- claims
- evidence_links
- procurement_events
- modernization_events
- retirement_events
- asset_status_history
- data_runs
- confidence_assessments
- aliases

## Important Modeling Decisions
- A platform is not the same as a variant.
- A variant is not the same as an individual asset.
- A named vessel or aircraft may be an individual asset.
- A source snapshot is not the same as a normalized claim.
- A procurement event is not proof of current in-service status.
- A quantity claim must preserve scope such as branch, date, and status.

## Confidence Model
Define a confidence model with:
- numeric score
- categorical band such as high, medium, low
- rationale text
- source tier
- number of corroborating sources
- recency factor
- extraction confidence
- contradiction penalty

## Entity Resolution Strategy
Plan deterministic and assisted matching using:
- normalized names
- aliases
- branch context
- category context
- manufacturer context
- date context
- official designation patterns
- human review fallback

## Ingestion Strategy by Source Type
Plan separate adapters for:
- HTML structured pages
- HTML narrative pages
- CSV or XLS datasets
- PDF documents
- manually curated seed files for lawful bootstrap
- APIs if discovered

## Evidence and Auditability
Every normalized record must allow tracing back to:
- source
- snapshot
- extraction method
- extraction date
- relevant text or structured field
- parser version
- run id

## Planning Output Artifacts
Create:
- architecture decision record
- schema proposal
- source adapter plan
- runbook
- risks and mitigations
- implementation backlog

## Acceptance Criteria for Planning Completion
Planning is complete only when:
- schema can be implemented without major ambiguity
- source adapters are scoped
- provenance model is explicit
- testing approach exists
- refresh workflow exists
- success criteria for Phase 1 are measurable

## Dashboard Constraint
Do not plan Phase 2 in depth until Phase 1 is accepted.
For now, only note dashboard-facing needs such as:
- future API compatibility
- evidence drill-down
- searchability
- exportability
