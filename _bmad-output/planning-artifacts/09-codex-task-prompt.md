# Codex Task Prompt

You are tasked with building a lawful public-source defense assets data platform focused first on Brazil.

Your work must follow three explicit stages:
- Research
- Plan
- Implement

You must not skip directly to implementation.

## Primary mission
Build the database foundation first.
Do not start the dashboard until the database, ingestion pipeline, provenance framework, confidence framework, and documentation are complete and accepted.

## What you need to accomplish

### Stage 1: Research
Research lawful public sources that can support a database of Brazilian military assets and related defense equipment records.
Prioritize official Brazilian public sources, then complementary public international sources.
Produce a clear research dossier with:
- source inventory
- legality and licensing notes
- trust ranking
- update cadence notes
- access method
- machine-readability notes
- recommended MVP sources
- data gap analysis
- LAI request templates for additional aggregate data

### Stage 2: Plan
Using the research output, design the full implementation plan for Phase 1.
Deliver:
- recommended tech stack
- repository structure
- database schema
- ingestion architecture
- provenance model
- confidence model
- entity resolution approach
- testing approach
- execution roadmap
- acceptance criteria

### Stage 3: Implement
Implement the database foundation end-to-end.
Deliver:
- project scaffold
- config and environment
- schema and migrations
- source catalog
- source adapters
- fetchers
- parsers
- normalization pipeline
- provenance and confidence capture
- tests
- documentation
- initial data load from at least one meaningful source

## Hard constraints
- use only public and lawful sources
- do not attempt to obtain restricted or classified information
- do not treat procurement announcements as proof of active service unless evidence supports that
- do not merge contradictory claims without traceability
- do not fabricate missing facts
- do not start the dashboard before the DB foundation is done

## Technical preference
Default to Python and PostgreSQL unless research clearly shows a better justified alternative.

## Evidence rules
Every claim must be traceable to a source snapshot.
Every normalized record must preserve provenance.
Contradictions must remain visible.
Confidence must be queryable.

## Expected behavior
At the end of each stage, summarize:
- what was produced
- assumptions
- open questions
- next recommended steps

Begin with Stage 1: Research.
