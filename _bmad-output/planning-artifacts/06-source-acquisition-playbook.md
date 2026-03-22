# Source Acquisition Playbook

## Objective
Provide a disciplined way to discover, evaluate, and integrate lawful public sources for Brazilian defense asset data.

## Initial High-Priority Source Families

### Official government and branch sources
Potential examples include:
- Ministry of Defense institutional and transparency pages
- branch fleet/equipment pages
- branch news pages with delivery, modernization, retirement announcements
- official public reports
- ordinances and public gazettes
- transparency and procurement portals

### Access to information
Use Fala.BR as the official public path for requesting additional lawful aggregate administrative information when not proactively published.

### International complement
Use SIPRI arms transfer data as transfer context and corroboration, not as a direct substitute for current active inventory.

## Source Intake Checklist
For every candidate source answer:
- is it public
- is it legal to access
- is reuse allowed or at least permissible for internal database construction
- is it official
- what data type does it contain
- how structured is it
- what is the update cadence
- what parser strategy is needed
- what evidence value does it provide
- is it suitable for MVP

## Source Types and Recommended Handling

### Structured web tables
Preferred.
Approach:
- stable parser
- column mapping
- direct staging model

### Narrative institutional pages
Useful but more fragile.
Approach:
- targeted parser
- text evidence extraction
- lower confidence if ambiguous

### PDF reports
Useful for documentation and evidence.
Approach:
- capture snapshot
- extract text carefully
- attach page references if possible
- use only when claim extraction is sufficiently reliable

### CSV or spreadsheet datasets
Preferred if officially published.
Approach:
- schema-aware importer
- field typing
- source snapshot retention

### Access-to-information responses
Potentially very valuable if lawful and received from the authority.
Approach:
- store as source documents
- preserve response date and request metadata
- mark as official response evidence

## Minimum Source Metadata to Store
- source name
- URL
- owner
- authority tier
- format
- access method
- fetch method
- parser type
- legal notes
- last checked
- active status

## Evidence Priority Order
1. official structured inventory-like source
2. official formal response or report
3. official branch asset page
4. official announcement or ordinance
5. international reputable research source
6. public secondary reference only for discovery, not direct ingestion

## Fala.BR Request Generation Guidance
When generating request templates:
- ask only for aggregate administrative information
- avoid operationally sensitive granularity
- ask for machine-readable output if appropriate
- specify date scope
- keep wording neutral and lawful

## Example Lawful Request Themes
- aggregate counts by model
- fleet composition by class and status
- delivered acquisitions by year
- retired assets by year
- official lists of named public vessels

## Data Gap Fallback Strategy
If a complete current inventory cannot be obtained:
- ingest what is official and public
- store unknown values explicitly
- add data quality notes
- maintain conflict and uncertainty fields
- do not force completeness

## Rejection Criteria for Sources
Reject or quarantine sources that are:
- legally ambiguous
- clearly unofficial and uncorroborated
- structurally unstable beyond reasonable maintenance
- incompatible with responsible use
