# Project Brief

## Project Name
Brazilian Defense Assets Intelligence Platform

## Primary Goal
Build a legally sourced, evidence-driven data platform that collects, normalizes, stores, and tracks publicly available information about Brazilian military assets, procurement signals, force structure indicators, and related defense equipment data.

## Initial Delivery Priority
Phase 1 is the database only.

The agent must first:
- discover and evaluate public/legal data sources
- ingest and normalize the data
- design and build the database
- document provenance and confidence
- expose a reproducible refresh pipeline

Only after the database is working and documented may the agent begin Phase 2, which is the web platform and dashboard.

## Scope

### In scope for Phase 1
- Official public sources
- Public access-to-information workflows
- Public procurement and transparency sources
- Public institutional pages
- Public open data datasets
- International public databases that legally complement official data
- ETL pipelines
- Normalized relational database
- Source provenance model
- Confidence scoring
- Entity resolution and deduplication
- Documentation
- Refresh/update workflows
- Tests and validation checks

### In scope for Phase 2
- API layer
- Search and filters
- Dashboard and visualizations
- Change tracking views
- Source evidence drill-down
- Admin ingestion monitoring
- Public website

### Out of scope
- Any attempt to bypass access restrictions
- Any collection of classified, leaked, restricted, or operationally sensitive material
- Any scraping that violates robots, terms, or legal constraints
- Any offensive, surveillance, or tactical intelligence functionality

## Problem Statement
There is no single guaranteed complete and continuously updated public inventory of all Brazilian military assets. Therefore the system must combine multiple lawful public sources, preserve source evidence, track confidence, and distinguish clearly between:
- officially confirmed records
- publicly inferred records
- estimated records
- historical or potentially outdated records

## Strategic Product Principle
Never present a record as official unless the supporting source is official and current enough for the claim being made.

## Core Design Principles
- legality first
- provenance first
- reproducibility first
- confidence over false precision
- database before dashboard
- source-aware data modeling
- update-safe ingestion
- transparent uncertainty handling

## Expected Data Domains
The system should be prepared to model at least:
- branches
- organizations
- asset categories
- platforms
- equipment variants
- manufacturers
- operators
- procurement events
- modernization events
- retirement events
- transfer events
- source documents
- claims extracted from sources
- evidence snapshots
- confidence scores
- data refresh runs

## Example Asset Categories
- tanks
- infantry fighting vehicles
- armored personnel carriers
- artillery
- air defense systems
- naval vessels
- submarines
- helicopters
- fixed-wing aircraft
- UAVs where publicly documented
- radar systems
- logistics vehicles where publicly relevant
- small arms only if sourced legally and with clear public relevance

## Data Truth Model
The database must support multiple truth levels:
- official_confirmed
- official_historical
- public_inferred
- third_party_reliable
- estimated
- contradictory

## Golden Rule
A quantity must never be stored without:
- source reference
- source date if available
- collection date
- confidence score
- confidence rationale
- jurisdiction or branch context
- status context such as active, planned, retired, transferred, under modernization

## Initial Public Source Families to Explore
- Brazilian Ministry of Defense public information and open data pages
- Fala.BR access-to-information portal
- Brazilian Navy public fleet and aircraft pages
- official branch institutional pages
- procurement and transparency portals
- official gazettes, ordinances, and strategic documents
- SIPRI arms transfer database
- other lawful public defense datasets if licensing permits reuse

## Deliverables
### Phase 1 mandatory
- source catalog
- research report
- data model
- ingestion architecture
- working database
- seeded data from initial sources
- provenance and confidence framework
- tests
- documentation
- refresh command

### Phase 2 optional after Phase 1 completion
- API
- dashboard
- search interface
- source evidence pages
- change history visualizations

## Success Criteria for Phase 1
- database can be recreated from code and documentation
- at least one full ingestion pipeline runs end-to-end
- every stored fact can be traced to evidence
- contradictory claims can coexist without data corruption
- agent documents what is known, unknown, and partially known
- schema is ready for future country expansion

## Non-Negotiable Constraints
- do not fabricate missing facts
- do not silently overwrite contradictory evidence
- do not equate procurement announcements with delivered in-service assets
- do not start the dashboard until the DB foundation is accepted
