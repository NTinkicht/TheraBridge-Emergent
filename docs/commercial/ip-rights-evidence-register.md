# COM-01: intellectual-property rights evidence register

**Status: NOT VERIFIED. No rights-holder declaration or commercial licensing authority is established by this register.**

This file records *categories of evidence to obtain*, not personal details, signed legal advice or the text of contracts. Evidence must live in a restricted document store and be reviewed by authorized parties.

| Scope / material | Evidence required | Status | Gate |
|---|---|---|---|
| TheraBridge-Emergent Git commit contributions | Authors and actual legal owners, origin of source, employment/contractor/student terms, assignment or permission where relevant | OPEN | #312 |
| Private specifications repository | Specification authors, assignment, access terms, imported code/architecture and authorship provenance | OPEN | #312 |
| Student / academic project components | HCT policies, supervision agreements, student contributions and their rights, any required permissions | OPEN | #312 |
| Partner-related materials | External clinic/center/municipal content, branding and contract rights | OPEN | #312 |
| Original logo and derivatives | Original creator, permission or assignment, trademark availability and approved commercial uses | OPEN | #312 #313 |
| Generated catalogue illustrations and UI assets | Source, generation service/model terms, third-party inputs, commercial use permission | OPEN | #313 |
| Software dependencies and container images | License text, copyright, notices, copyleft and deployment/distribution implications | OPEN | #313 |
| AI model, hosted service and training/data inputs | Provider terms, output rights, permitted healthcare use, processing terms | OPEN | #313 |

## Decision protocol

1. The project owner or authorized business representative identifies the proposed legal contracting entity and responsible reviewers.
2. Author/contributor and relevant source history are reconciled against an exact source revision; Git identities by themselves do **not** establish ownership.
3. Legal counsel or an authorized rights reviewer records a documented conclusion for each category in restricted evidence storage.
4. Publish only an anonymized approval status and permitted commercial scope in this repository.
5. Permit an authoritative root LICENSE or customer contract only after unresolved rights and third-party obligations have been cleared.

## Explicit boundaries

- Keep the GitHub repository public for the owner's CI operating choice.
- Do not put personally identifying agreements or privileged correspondence into the public repository.
- Do not infer commercial authorization from possession of the Git repository, its `private: true` npm package fields, or access to a partner's content.
- This register is not an approval to process real clinical or children's records.
