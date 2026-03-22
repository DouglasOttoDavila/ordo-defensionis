# Database Specification

## Purpose
Define a normalized, provenance-aware database for storing Brazilian defense asset data from public lawful sources.

## Database Type
Relational database, preferably PostgreSQL.

## Schema Design Goals
- provenance first
- support uncertainty
- support contradictory claims
- support historical changes
- support expansion to other countries later
- support future dashboard and API use cases

## Core Tables

### branches
Represents top-level military branches.
Fields:
- id
- code
- name
- country_id
- created_at
- updated_at

### organizations
Represents sub-organizations within branches.
Fields:
- id
- branch_id
- name
- type
- parent_org_id
- created_at
- updated_at

### countries
Fields:
- id
- iso_code
- name

### asset_categories
Fields:
- id
- code
- name
- parent_category_id
- description

### manufacturers
Fields:
- id
- name
- country_id
- notes

### platforms
Represents canonical equipment families.
Fields:
- id
- category_id
- canonical_name
- designation
- manufacturer_id
- origin_country_id
- description
- created_at
- updated_at

### platform_variants
Represents variants or subtypes.
Fields:
- id
- platform_id
- variant_name
- designation
- notes
- created_at
- updated_at

### assets
Represents identifiable individual assets where publicly known, such as named ships or tail-numbered aircraft when lawful and public.
Fields:
- id
- platform_variant_id
- asset_name
- serial_or_tail_number
- branch_id
- organization_id
- commission_date
- retirement_date
- current_status
- notes
- created_at
- updated_at

### aliases
Stores alternate names and designations.
Fields:
- id
- entity_type
- entity_id
- alias
- alias_type
- source_id

### sources
Catalog of source origins.
Fields:
- id
- source_key
- name
- url
- owner
- source_type
- authority_tier
- country_id
- legal_notes
- active_flag
- created_at
- updated_at

### source_snapshots
Represents a captured raw version of a source.
Fields:
- id
- source_id
- snapshot_hash
- fetched_at
- source_date
- content_type
- storage_path
- fetch_status
- parser_version
- metadata_json

### claims
Atomic claims extracted from a source snapshot.
Examples:
- Branch X operates Y units of variant Z
- Vessel A belongs to class B
- Aircraft model C entered service in year D
Fields:
- id
- source_snapshot_id
- subject_type
- subject_id
- predicate
- object_type
- object_id
- quantity_value
- quantity_unit
- claim_text
- claim_date
- scope_branch_id
- scope_org_id
- status_context
- extraction_method
- created_at

### evidence_links
Connects normalized entities to claims and source snapshots.
Fields:
- id
- entity_type
- entity_id
- claim_id
- relevance_type
- created_at

### procurement_events
Fields:
- id
- platform_variant_id
- branch_id
- event_date
- quantity
- event_type
- supplier
- contract_reference
- source_claim_id
- notes

### modernization_events
Fields:
- id
- platform_variant_id
- asset_id
- branch_id
- event_date
- description
- source_claim_id
- notes

### retirement_events
Fields:
- id
- platform_variant_id
- asset_id
- branch_id
- event_date
- quantity
- source_claim_id
- notes

### asset_status_history
Tracks changes in status over time.
Fields:
- id
- asset_id
- platform_variant_id
- branch_id
- status
- effective_date
- end_date
- source_claim_id
- notes

### confidence_assessments
Fields:
- id
- entity_type
- entity_id
- claim_id
- confidence_score
- confidence_level
- confidence_reason
- corroboration_count
- contradiction_count
- source_tier
- recency_score
- extraction_confidence
- reviewed_flag
- created_at

### data_runs
Tracks ETL runs.
Fields:
- id
- run_type
- started_at
- finished_at
- status
- summary_json
- code_version
- initiated_by

## Key Modeling Rules
- a source snapshot can generate many claims
- a claim can support many normalized entities
- entities can have many pieces of evidence
- conflicting claims may coexist
- current status must be derived from evidence and history, not guessed

## Derived Views to Plan For
- current_inventory_by_branch
- current_inventory_by_category
- assets_with_conflicting_quantities
- sources_by_recency
- high_confidence_assets
- low_confidence_assets
- recent_procurement_events

## Indexing Considerations
Index:
- canonical_name
- designation
- alias
- source_key
- fetched_at
- claim_date
- branch_id
- category_id
- current_status
- confidence_level

## Normalization Rules
Normalize:
- whitespace
- punctuation
- branch names
- platform names
- variant naming patterns
- date formats
- quantity formats
- Portuguese and English naming where applicable

## Conflict Handling
When conflicting quantities exist:
- store both
- track separate claims
- assign confidence
- expose conflict in a derived view
- never discard evidence without an explicit rule

## Future-Proofing
Design the schema so other countries can be added later without breaking the model.
Avoid Brazil-specific hardcoding except in seed data and source adapters.
