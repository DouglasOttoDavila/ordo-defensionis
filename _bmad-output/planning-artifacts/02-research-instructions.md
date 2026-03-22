# Research Instructions

## Objective
Find and assess all lawful public data sources relevant to building a database of Brazilian military assets, equipment, procurement signals, and related force structure information.

## Research Deliverable
Create a research dossier that answers:
- which sources exist
- what each source contains
- how the data can be accessed
- whether it can be legally used
- how current it appears to be
- how trustworthy it is
- how it should be modeled
- whether it belongs in the MVP

## Research Priorities

### Priority 1: Official Brazilian public sources
Investigate first:
- Ministry of Defense public information pages
- open data portals
- access to information channels
- branch public websites
- official fleet/equipment pages
- transparency and procurement portals
- official strategic documents, ordinances, reports, and gazettes

### Priority 2: Public international complementary sources
Investigate:
- SIPRI arms transfers database
- other public research datasets only if clearly legal and citable

### Priority 3: Indirect official evidence sources
Investigate:
- procurement notices
- contract publications
- modernization announcements
- decommissioning announcements
- budget execution signals
- official press releases
- public annual reports

## Mandatory Initial Source Checks
The research should explicitly assess at least these source families:
- https://www.gov.br/defesa
- https://www.gov.br/defesa/pt-br/acesso-a-informacao
- https://www.gov.br/acessoainformacao/pt-br/falabr
- https://falabr.cgu.gov.br/web/home
- https://www.marinha.mil.br/meios-navais
- https://www.sipri.org/databases/armstransfers

## Research Output Format

### Section 1: Executive summary
Summarize:
- best sources for MVP
- strongest official sources
- biggest data gaps
- legal constraints
- recommended first ingestion targets

### Section 2: Source inventory table
For each source include:
- source_name
- source_url
- owner
- source_type
- official_or_nonofficial
- country
- access_method
- format
- update_signal
- likely_entities
- likely_fields
- licensing_notes
- robots_or_terms_notes
- trust_level
- mvp_recommendation
- notes

### Section 3: Source-by-source findings
For each source document:
- what it contains
- what it does not contain
- expected parsing strategy
- expected data quality
- risks
- whether it should be used now, later, or not at all

### Section 4: Gap analysis
Identify missing domains such as:
- complete current inventory
- operational status ambiguity
- quantities without official confirmation
- inconsistent naming across branches
- event versus inventory confusion

### Section 5: LAI opportunities
Draft candidate access-to-information request templates for lawful aggregate administrative information, such as:
- list of active naval assets by class and name
- list of aircraft by model and aggregate count
- list of armored vehicles by model and aggregate count
- list of retired assets by year
- list of acquisitions delivered in a period

The agent must generate templates only. Do not auto-submit requests unless the user explicitly asks and the toolchain permits it.

## Source Evaluation Heuristics
Score each source on:
- legality
- authority
- freshness
- structure
- completeness
- machine-readability
- stability
- maintainability for ingestion

## Data Classification Rules
Classify each source as one or more of:
- inventory source
- event source
- context source
- cross-validation source
- metadata source
- evidence source

## Source Reliability Tiers
Use:
- Tier 1 official structured
- Tier 2 official semi-structured
- Tier 3 official narrative
- Tier 4 reputable public research
- Tier 5 low-confidence public reference

Tier 5 sources should not feed the MVP database directly.

## Research Quality Bar
The research phase is only complete when it identifies:
- at least one solid official source to ingest first
- a legal path for additional discovery
- a data model implication for each major source family
- the limits of what cannot be known reliably from public data

## Do Not Do
- do not assume there is one complete official master dataset
- do not confuse arms transfers with current active inventory
- do not infer active service from old announcements without evidence
- do not treat branch news posts as authoritative inventory totals unless clearly stated
