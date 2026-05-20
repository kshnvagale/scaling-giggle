# MERIDIAN INSURANCE POLICY LIFECYCLE PROCESS MAP
## Personal Auto & Homeowners Lines of Business - End-to-End Integration Analysis

**Prepared for:** Digital Transformation Initiative - M1.T1 Task  
**Date:** April 2026  
**Analyst:** Insurance Systems Mapping Team  
**Classification:** Internal - Architecture Reference  

---

## EXECUTIVE SUMMARY

This document provides a comprehensive, system-integrated mapping of the complete policy lifecycle for Meridian Insurance's two largest lines of business: **Personal Auto** and **Homeowners**. The analysis identifies:

- **All 6 lifecycle stages** (Quote → Bind → Issue → Endorse → Renew → Cancel)
- **12+ distinct system integration points** with data flows, protocols, and known issues
- **Line-of-business divergences** showing where Auto and Homeowners processes differ
- **Regulatory compliance requirements** with state-specific notice periods
- **Critical pain points** limiting operational efficiency and data consistency

The mapping reflects Meridian's current **dual-PAS reality**: a 30-year-old mainframe handling legacy policies and regulatory data alongside Guidewire PolicyCenter managing active Auto and Homeowners policies. This architecture creates both organizational complexity and operational risk.

---

## 1. POLICY LIFECYCLE OVERVIEW

### 1.1 The Six Stages

Every insurance policy at Meridian progresses through six lifecycle stages, though the mechanics differ by line of business and system:

1. **QUOTE** — Risk data is entered and premium is calculated via external rating engine
2. **BIND** — Contractual commitment occurs; underwriting rules are evaluated; billing account is created
3. **ISSUE** — Policy-of-record is created; policy number is assigned; documents are generated
4. **ENDORSE** — Mid-term changes are processed; premium may be adjusted; documents are updated
5. **RENEW** — Coverage is extended for a new term; risk is re-rated; renewal offer is sent to policyholder
6. **CANCEL** — Policy is terminated; regulatory notices are issued; refunds are processed

### 1.2 System of Record

| Line of Business | System | Notes |
|---|---|---|
| Personal Auto | Guidewire PolicyCenter | Migrated 3 years ago; ~3.2M active policies |
| Homeowners | Guidewire PolicyCenter | Migrated 3 years ago; ~1.6M active policies |
| Commercial Property | Legacy Mainframe PAS | Still on mainframe; migration to PolicyCenter scheduled Q3 2026 |
| General Liability | Legacy Mainframe PAS | Still on mainframe |
| Life Insurance | Legacy Mainframe PAS | Still on mainframe |
| Historical Data (all LOBs) | Legacy Mainframe PAS | Pre-migration history + ongoing archive |

**Key Point:** PersonalAuto and Homeowners ARE on PolicyCenter, but historical data, regulatory reporting, and some complex edge-case policies still run on the mainframe.

---

## 2. STAGE 1: QUOTE

### 2.1 Process Flow

The Quote stage begins when a prospective policyholder (or their agent) requests a premium estimate. The quote is **non-binding** and valid for 30 days.

**System Flow:**
```
Agency AMS System
    ↓
PolicyCenter Submission Creation
    ↓ (ACORD XML REST API)
Rating Engine
    ↓ (Premium calculation)
PolicyCenter (displays quote to agent)
```

**Timeline:** Quote calculation typically takes 1-3 seconds, but can extend to 15-25 seconds when external data pulls are required.

### 2.2 External Data Pulls

The complexity of Quote processing diverges significantly by LOB:

#### AUTO: MVR + CLUE Reports (5-10 second latency)
- **MVR (Motor Vehicle Record):** Driving history for each listed driver
  - Sourced from state DMV systems
  - Captures violations, accidents, license status
  - Required for underwriting decisions

- **CLUE (Comprehensive Loss Underwriting Exchange):** Claims history
  - Captures prior insurance losses
  - Used for claims frequency assessment
  - Mandatory for binding decision

**Data Integration Point #1:** Agency AMS (Epic, HawkSoft, AMS360) → PolicyCenter via ACORD XML  
**Protocol:** REST API (synchronous) for modern AMS platforms; SFTP batch (nightly) for legacy AMS360  
**Format:** ACORD XML v2.25 (inbound), ACORD XML v2.38 (responses from rating engine)  

#### HOMEOWNERS: Protection Class + Replacement Cost Estimate (10-15 second latency)
- **Protection Class:** ISO rating (1-10) based on proximity to fire station and water supply
  - Class 1 = best (closest to fire protection)
  - Class 9-10 triggers underwriter review
  - Critical driver of premium

- **Replacement Cost Estimate:** Third-party (CoreLogic) estimate of dwelling reconstruction cost
  - Based on property address, square footage, construction type, year built
  - Determines recommended Coverage A (dwelling) limit
  - Changes by market and local construction costs

**Data Integration Point #2:** PolicyCenter → Third-party rating data services (via REST API)

### 2.3 ACORD XML Rating Interface - Known Issues

**Integration Points #3-4: Rating Engine ACORD XML Request/Response**

The rating engine integration is a **known pain point** with a ~12% error rate on quotes. The root cause is an ACORD XML version mismatch:

| Issue | Impact | Affected Field | Example |
|---|---|---|---|
| Address Truncation | Address fields > 30 char are truncated | `Addr1` (60 char field mapped to 30) | "123 Shady Oak Boulevard Lane" → "123 Shady Oak Boulevard L" |
| Multi-Vehicle Premium Splits | Premium breakdown for vehicles on same policy is lost | `VehiclePremiumDetail` element not recognized | Auto quote with 2 vehicles returns total premium but no per-vehicle breakdown |
| Scheduled Personal Property Items | Scheduled items map to wrong coverage code | `ScheduledItem` nested structure | Homeowners jewelry scheduled item mapped to liability instead of personal property |

**Consequence:** Underwriting team spends approximately **4 hours per day** manually re-entering data from rating engine responses into PolicyCenter because field mapping failed. (Source: Priya Nair, PolicyCenter Configuration Analyst)

**Fix Status:** Proposed in JIRA tickets RATE-1847 through RATE-1852. Not yet scheduled due to coordination requirements across three teams (Rating Engine operations, PolicyCenter configuration, and Enterprise Data Architecture).

### 2.4 Quote Stage Touchpoints

**Human Touchpoint:**
- **Agent reviews quote** with applicant, may adjust coverages and re-rate multiple times before applicant decides
- Quote remains in "Draft" status in PolicyCenter; no commitment until bind

**Data Stored:**
- Quote details cached in PolicyCenter for 30 days
- Premium calculation details logged for regulatory audit trail

---

## 3. STAGE 2: BIND

### 3.1 Process Flow

Binding is the **moment of contractual commitment**. The applicant accepts the quoted terms, and Meridian agrees to provide coverage. Binding triggers multiple downstream processes.

**Decision Path:**
```
Bind Decision (Manual or Auto-Bind)
    ↓
    ├─→ 65% Auto (Auto)    → Automatic approval (underwriting rules pass)
    ├─→ 40% Auto (HO)      → Automatic approval
    │
    └─→ 35% Manual (Auto)  → Underwriter review required
    └─→ 60% Manual (HO)    → Underwriter review required
    
    ↓ (All paths converge)
    
BillingCenter API Call (Real-time REST API)
    ↓
Billing Account Created + Payment Plan Selected
```

### 3.2 Underwriting Rules Engine

PolicyCenter contains a **Gosu-based rules engine** (Guidewire's proprietary JVM language) that evaluates underwriting rules for each submission.

**AUTO: Auto-Bind Criteria (approximately 65% of quotes auto-bind)**
- Applicant age 25+
- No DUI in last 5 years
- ≤ 2 at-fault accidents in last 3 years
- ≤ 3 traffic violations in last 3 years
- Valid driver's license
- Valid ISO personal auto code
- **Referral triggers:** DUI (any), 3+ at-fault accidents, youthful driver (<25) with no prior coverage, commercial use

**HOMEOWNERS: Auto-Bind Criteria (approximately 40% of quotes auto-bind)**
- Protection class 1-8
- No prior water damage claims
- No pool, trampoline, or exotic animals
- Dwelling coverage ≤ $750K
- Roof age ≤ 20 years
- **Referral triggers:** Protection class 9-10, prior water damage, pool/trampoline, dwelling coverage >$750K (requires property inspection, adding 5-7 business days), roof age >20 years

If underwriting rules do NOT pass, an **Activity** is created and assigned to an underwriter in the Diane Kowalski's team for manual review and approval.

**Data Integration Point #5: PolicyCenter → BillingCenter (REST API)**

When bind is approved (either auto or manual), PolicyCenter immediately sends a real-time API call to BillingCenter with:
- Policy details (policy number not yet assigned — uses temporary ID)
- Named insured and contact information
- Premium amount
- Selected payment plan
- Effective date

BillingCenter responds by:
- Creating a billing account
- Generating an installment schedule based on the selected plan
- Recording the first payment due date

### 3.3 Payment Plans & Billing

Meridian offers four payment plans for personal lines:

| Plan | Billing Frequency | Service Fee | Availability | Typical Cost Example |
|---|---|---|---|---|
| Annual (pay-in-full) | One payment at bind | $0 | Auto, Homeowners | $1,200 annual premium, $0 fee |
| Semi-annual | 2 payments | $5/installment | Auto, Homeowners | $1,200 premium = $600 × 2 + $10 fee = $610 total |
| Quarterly | 4 payments | $8/installment | Auto only | $1,200 premium = $300 × 4 + $32 fee = $1,232 total |
| Monthly | 10 (annual term) or 5 (semi-annual term) | $10/installment | Auto, Homeowners | $1,200 premium = $120 × 10 + $100 fee = $1,300 total |

**Known Issue:** Commission calculation logic differs between mainframe-originated (pre-migration) and PolicyCenter-originated policies, causing reconciliation discrepancies for long-standing policies. (Source: BillingCenter team)

### 3.4 Bind Stage Touchpoints

**Human Touchpoints:**
- **Agent submits binding request** to PolicyCenter
- **Underwriter performs manual review** (for referred submissions) and either approves or declines
- **Policyholder may be contacted** if additional information is needed before underwriter approval

**Time to Bind:**
- Auto-bind submissions: Immediate (seconds)
- Manual review: 24-48 hours average (underwriter queue dependent)

---

## 4. STAGE 3: ISSUE

### 4.1 Process Flow

Issuance is when the **policy becomes the official policy-of-record**. The system assigns a policy number, and documents are generated for the policyholder.

**System Flow:**
```
Bind Approval (Auto or Manual)
    ↓
PolicyCenter assigns Policy Number
    ├─→ Auto: PA-XXXXXXX (e.g., PA-3847201)
    └─→ Homeowners: HO-XXXXXXX (e.g., HO-2195438)
    
    ↓ (Event fired)
    
Thunderhead/Smart Communications
    ↓ (State-specific template selection + rendering)
    
Document Package Generated:
    ├─→ Declarations Page
    ├─→ Coverage Forms & Endorsements
    ├─→ State-required Notices
    └─→ Payment Schedule
    
    ↓
PolicyCenter Document Management (stored & indexed)
    
Policy Status: IN FORCE (Coverage now effective)
```

### 4.2 Policy Number Formats

- **Personal Auto:** PA-XXXXXXX (sequentially assigned)
  - Example: PA-3847201, PA-3851044
  - 7-digit numeric suffix
  - Prefix "PA" indicates Personal Auto

- **Homeowners:** HO-XXXXXXX (sequentially assigned)
  - Example: HO-2195438, HO-2201784
  - 7-digit numeric suffix
  - Prefix "HO" indicates Homeowners

The policy number is generated by PolicyCenter's sequence generator and becomes the primary identifier for the policy across all downstream systems.

### 4.3 Document Generation - Integration Point #6

**System:** Thunderhead / Smart Communications (event-driven from PolicyCenter)  
**Protocol:** Event-driven XML document requests  
**Trigger:** Policy status change to "In Force"  

**State-Specific Templates:**
- **Personal Auto:** 51 templates (one per state + DC + territories)
  - Dec page format varies by state (notice language, format, required disclosures)
  - Total of 89 templates when including cancellation/non-renewal notices

- **Homeowners:** 47 templates (46 states where HO is written + DC; no FL/LA due to catastrophic risk)
  - Dec page format varies by state
  - Additional templates for coastal states (wind/hail exclusion notices)
  - Total of 89 templates

**Template Maintenance:** Managed by Priya Nair (PolicyCenter configuration) with compliance review

### 4.4 Declarations Page Content by LOB

#### AUTO DECLARATIONS PAGE INCLUDES:
- Policy number (PA-XXXXXXX), named insured, policy period
- **Vehicle Schedule:** Year, make, model, VIN for each insured vehicle
- **Driver List:** Name, date of birth, license number for each listed driver
- Coverage and limits per vehicle (Liability, Collision, Comprehensive, UM, Medical Payments)
- Premium breakdown by coverage and by vehicle
- Discounts applied (multi-car, good driver, bundling)
- Grace period for payment
- Contact information for policyholder service

#### HOMEOWNERS DECLARATIONS PAGE INCLUDES:
- Policy number (HO-XXXXXXX), named insured, policy period
- **Property Description:** Address, construction type, year built, square footage
- **Coverage Details:** A-F limits and deductibles
  - Coverage A: Dwelling (structure)
  - Coverage B: Other Structures
  - Coverage C: Personal Property (contents)
  - Coverage D: Loss of Use
  - Coverage E: Personal Liability
  - Coverage F: Medical Payments to Others
- **Scheduled Personal Property List** (if any) with appraised values
- Optional coverages (water backup, identity theft, equipment breakdown)
- Premium breakdown by coverage
- **Replacement Cost Estimate** (inform ed by CoreLogic estimate pulled at quote time)
- Grace period for payment

### 4.5 Known Compliance Issues

**Cancellation Notice Templates - Recently Updated (Q1 2026):**

Two states had regulatory changes that were not immediately reflected in templates:

- **Connecticut (Effective Jan 1, 2026):** Non-payment cancellation notice period increased from 10 to **15 days** (HB 6590). Additionally, notice must now include Connecticut Insurance Department toll-free number. Meridian's template was updated late; approximately 45 CT non-payment cancellations processed in January-February may not have complied with the new 15-day requirement. (Source: Sarah Lindgren, VP of Compliance, memo dated Feb 14, 2026)

- **Colorado (Effective Mar 1, 2026):** Underwriting cancellation notice period for Homeowners with property-condition-related cancellations increased from 30 to **45 days** (SB 23-287). Auto and other underwriting reasons remain 30 days. Approximately 8-10 CO Homeowners underwriting cancellations processed since March may not have complied. (Source: Same memo)

**Remediation Status:** Template updates scheduled for completion by March 15, 2026. Operations team conducting retroactive review of affected policies.

### 4.6 Issue Stage Touchpoints

**Human Touchpoints:**
- **Underwriter (if manual review was required) provides approval** and issue proceeds
- **Policyholder receives documents** by mail or email (per preference)

**Data Storage:**
- Documents stored in PolicyCenter Document Management (accessible via UI)
- Separate from mainframe-era documents (IBM FileNet) — no unified search across both repositories

---

## 5. STAGE 4: ENDORSE (Mid-Term Policy Changes)

### 5.1 Process Flow

An endorsement is a mid-term modification to an active, in-force policy. Endorsements may trigger re-rating, document updates, and billing adjustments.

**Process:**
```
Policyholder or Agent requests change to active policy
    ↓
PolicyCenter creates new policy period (same policy number, new effective date)
    ↓
    ├─→ Change affects premium?
    │    ├─→ YES: Send ACORD XML Rating Request to Rating Engine
    │    │        Receive new premium
    │    │        Create billing adjustment in BillingCenter
    │    └─→ NO: Update billing if credits/debits apply (e.g., rate changes)
    │
    └─→ Always: Update PolicyCenter policy record, generate new declarations page
    
    ↓
Thunderhead generates updated documents (new dec page ± coverage amendments)
    
Endorsement effective date recorded in PolicyCenter
```

### 5.2 Endorsement Types by LOB

#### AUTO: Most Common Endorsement Types
1. **Add/Remove Driver (~40% of Auto endorsements)**
   - Adding a youthful driver (<25) typically triggers largest premium increase
   - Requires MVR pull and re-rating
   - New dec page generated with updated driver list

2. **Add/Remove Vehicle (~30% of Auto endorsements)**
   - Changes vehicle schedule on dec page
   - Requires re-rating if vehicle is insured (adds new vehicle) or is primary vehicle
   - May require inspection if adding higher-value vehicle

3. **Coverage Limit Change (~20% of Auto endorsements)**
   - Increasing liability limits, changing deductibles
   - Usually minor premium impact
   - Straightforward re-rating

4. **Garaging Address Change (~10% of Auto endorsements)**
   - Affects rating (ZIP code factors)
   - May require loss control review if moving to high-risk area

**ALL Auto endorsement types trigger re-rating.**

#### HOMEOWNERS: Most Common Endorsement Types
1. **Add/Remove Scheduled Personal Property (~35% of HO endorsements)**
   - Requires supporting **appraisal document** upload
   - **Pain Point:** Agents frequently forget to attach appraisal, causing processing delays
   - Examples: Jewelry, art, collections
   - Premium impact: Usually moderate (adds coverage)

2. **Dwelling Coverage Limit Change (~25% of HO endorsements)**
   - Often triggered by renovation or market adjustment
   - Requires replacement cost comparison
   - May trigger property inspection if significant increase

3. **Add Optional Coverage (~20% of HO endorsements)**
   - Water backup, identity theft recovery, equipment breakdown, home business
   - Straightforward premium addition
   - Minimal processing friction

4. **Update Property Characteristics (~20% of HO endorsements)**
   - Roof replacement, renovation completion, pool installation, heating system upgrade
   - May trigger re-rating if material changes
   - May require inspection

**Homeowners endorsement trigger re-rating if coverage or property characteristics change.**

### 5.3 Re-Rating for Endorsements - Integration Point #3 (Revisited)

When an endorsement changes premium, PolicyCenter sends ACORD XML rating request to Rating Engine:
- Request includes updated driver/vehicle/property information
- Rating Engine returns updated premium
- **Same 12% error rate applies** — address truncation, multi-vehicle splits can occur even on endorsements

If rating error occurs, underwriting team must manually correct the premium before the endorsement is finalized and documented.

### 5.4 Billing Impact

**Integration Point #5 (Revisited): PolicyCenter → BillingCenter**

When an endorsement changes premium mid-term, PolicyCenter sends updated premium to BillingCenter:
- **If premium increases:** Additional charge added to billing account, new payment due date calculated
- **If premium decreases:** Credit applied to account (may be carried forward to next billing cycle or refunded)
- **If effective date is mid-billing-period:** Proration calculated

**Known Issue:** Duplicate billing schedules occasionally created on reinstatement of non-pay cancelled policies. Requires manual cleanup. (Source: BillingCenter team)

### 5.5 Document Updates - Integration Point #6 (Revisited)

When endorsement is approved:
- Thunderhead receives event from PolicyCenter
- Renders updated declarations page with new effective date and changes highlighted
- Generates coverage amendment documents (if applicable)
- Documents are stored in PolicyCenter Document Management and provided to policyholder

### 5.6 Endorse Stage Touchpoints

**Human Touchpoints:**
- **Policyholder or Agent initiates change** (via PolicyCenter portal or phone/email to operations)
- **Underwriter may review** if endorsement falls outside standard parameters
  - Example: HO endorsement adding water backup coverage after history of water damage claims
- **Operations team processes** and ensures all documents are generated and sent

**Time to Endorse:**
- Standard endorsement: 1-3 business days
- Endorsement with property inspection required: 5-7 business days

---

## 6. STAGE 5: RENEW

### 6.1 Process Flow

Renewal extends coverage for a new policy term. The renewal process starts 60 days before expiration and involves automated batch processing, re-rating, underwriter review of flagged items, and policyholder acceptance.

**Process Timeline:**
```
60 days before expiration:
    ↓
Nightly batch job initiates renewal (PolicyCenter scheduled job)
    ├─→ Auto: 6-month renewal cycle
    └─→ Homeowners: 12-month renewal cycle

Gather Updated Risk Data:
    ├─→ Claims history from ClaimCenter (nightly extract - Integration #8)
    ├─→ External data updates (MVR, CLUE, property characteristics)
    └─→ Current rate tables from Rating Engine

    ↓
Rating Engine Re-Calculates Premium (ACORD XML - Integration #3)
    ├─→ Auto: 6-month-forward premium
    └─→ Homeowners: 12-month-forward premium

    ↓
Underwriter Review:
    ├─→ Premium change >15%? → Flag for review
    ├─→ Auto: 3+ new claims? → Flag for review
    └─→ Homeowners: 2+ water damage claims in 3 years? → Flag for non-renewal consideration

    ↓
Renewal Offer Generated & Sent to Policyholder (30 days before expiration)
    ├─→ Mail (standard)
    └─→ Email (if opted in)

Policyholder Decision:
    ├─→ Accepts (pays premium) → New term begins on expiration date
    ├─→ Declines (shops elsewhere) → Policy non-renews
    └─→ Non-payment (doesn't pay premium) → Cancels for non-payment (triggers Integration #12)
```

### 6.2 LOB-Specific Renewal Cycles

| LOB | Cycle | Renewal Trigger Point |
|---|---|---|
| Personal Auto | **6 months** | Renewal initiated 60 days before 6-month expiration |
| Homeowners | **12 months** | Renewal initiated 60 days before annual expiration |

This difference drives different operational patterns:
- Auto renews twice per year (higher volume, more frequent underwriter reviews)
- Homeowners renews once per year (concentrated volume in annual renewal windows)

### 6.3 Claims History Integration - Integration Point #8

**System:** ClaimCenter → PolicyCenter (nightly batch extract)  
**Format:** CSV extract  
**Schedule:** Every night at 11 PM CT  
**Purpose:** Renewal underwriting decisions are informed by recent claims activity

The claims extract includes:
- Claim numbers and claim dates
- Loss type (comprehensive, collision, liability, property damage, etc.)
- Claim status (open, closed, reserved)
- Paid losses

This data feeds into underwriter decision logic:
- **Auto:** Policies with 3+ new claims in the last 3 years may be non-renewed
- **Homeowners:** Policies with 2+ water damage claims in the last 3 years are flagged for potential non-renewal

### 6.4 Re-Rating for Renewal - Integration Points #3-4 (Revisited)

Renewal re-rating follows the same process as quote re-rating, with the same ~12% error rate for ACORD XML mapping:
- Address truncation, multi-vehicle splits, scheduled items can fail
- Underwriting team must manually correct renewal premiums if mapping errors occur

### 6.5 Renewal Underwriting Rules

**AUTO:**
- Premium increase >15% → Underwriter review (may decline renewal if risk profile worsened)
- 3+ claims in 3 years → Non-renewal candidate
- DUI or major violation in last year → Possible non-renewal
- New business written in direct channel from competitor may indicate lapsed competitor policy → No automatic non-renewal
- **Most renewals are automated** — only approximately 5-10% require active underwriter decision

**HOMEOWNERS:**
- Premium increase >15% → Underwriter review
- 2+ water damage claims in 3 years → Non-renewal consideration (property condition)
- Recent claims (large loss, multiple claims) → Possible non-renewal
- Area-level changes (wildfire zone designation, flood zone changes) → May trigger rate adjustment or non-renewal
- **Lower automatic renewal rate than Auto** — approximately 15-20% require active underwriter review

### 6.6 Renewal Documents - Integration Point #6 (Revisited)

Thunderhead generates:
- **Renewal declarations page** — shows new term dates, updated premium, any changes to coverages
- **Renewal notice** — state-required disclosure of renewal rights and refund options
- **Updated coverage forms** (if forms changed due to new rate filing)

### 6.7 Renewal Offer Delivery

PolicyCenter initiates delivery (integration with mail/email provider):
- **Primary delivery:** US Mail to policyholder address on file
- **Secondary delivery:** Email (if policyholder opted into electronic delivery)
- **Timing:** 30-45 days before expiration (varies by state requirement)

Policies not paid by expiration date automatically non-renew.

### 6.8 Renew Stage Touchpoints

**Human Touchpoints:**
- **Underwriter reviews** flagged renewals (premium changes, claims, other risk factors)
- **Underwriter makes non-renewal decisions** (if applicable)
- **Policyholder makes renewal decision** (accept or shop alternative carriers)
- **Operations team processes** renewals and maintains renewal calendars

**Time to Renew:**
- Automated renewal: Batch processed nightly
- Underwriter review (if flagged): 24-48 hours
- Policyholder response window: 15-30 days before expiration (varies by state)

---

## 7. STAGE 6: CANCEL

### 7.1 Cancellation Types

Cancellation terminates a policy before its natural expiration date. Three distinct types exist, each with different workflows, triggers, and regulatory requirements:

#### TYPE 1: VOLUNTARY CANCELLATION
- **Trigger:** Policyholder requests cancellation
- **Reason Examples:** Vehicle sold, moved, switched to competitor, no longer needs coverage
- **Who Initiates:** Policyholder (via phone, portal, or agent)
- **Workflow:** 
  - Policyholder or agent submits cancellation request
  - Operations team processes immediately or at specified future date
  - Refund calculated (if paid annual or if paid ahead on installment plan)
  - Cancel effective date recorded in PolicyCenter
  - Cancellation confirmation notice sent to policyholder
  
- **Notice Requirement:** Varies by state; typically 5-15 days advance notice, but not required if policyholder requests

#### TYPE 2: NON-PAYMENT CANCELLATION
- **Trigger:** Policyholder fails to pay premium within grace period
- **Typical Sequence:**
  - Payment due date passes
  - Day 1: BillingCenter sends payment reminder (automated)
  - Day 15: BillingCenter sends second reminder (automated)
  - Day 30+: Grace period expires
  - **BillingCenter sends CancellationRequest event to PolicyCenter** (Integration Point #12)
  - PolicyCenter creates cancellation in Operations queue
  
- **Workflow:**
  - Operations team receives cancellation event in PolicyCenter
  - Generates regulatory cancellation notice (state and reason specific)
  - Sends notice to policyholder with reason and appeal rights
  - Effective date of cancellation follows state notice requirements (10-20 days typically)
  - If payment received during notice period, cancellation is reversed and policy reinstated
  
- **Notice Requirement:** **10-15 days advance notice** (varies by state; recent changes in CT and CO)
  - **Connecticut (NEW Jan 1, 2026):** Non-payment notices now require 15 days (increased from 10) plus state Insurance Department hotline number
  - **Most other states:** 10 days

- **Integration Point #12: BillingCenter → PolicyCenter**
  - This is the **only integration direction that flows from BillingCenter back to PolicyCenter**
  - Triggered when delinquency threshold (typically 30 days late) is reached
  - PolicyCenter must receive and process the event to generate regulatory notice

**Known Issue:** Reinstatement of non-pay cancelled policies occasionally creates duplicate billing schedules in BillingCenter, requiring manual cleanup. (Source: BillingCenter team)

#### TYPE 3: UNDERWRITING CANCELLATION
- **Trigger:** Insurer discovers post-bind that risk is uninsurable or material misrepresentation occurred
- **Reason Examples:**
  - **Auto:** Driver age/license misrepresented, undisclosed vehicles, business use discovered
  - **Homeowners:** Property condition worse than represented, roof condition misrepresented, prior loss history not disclosed, property being used as rental
  
- **Workflow:**
  - Underwriter identifies issue (through claims activity, external verification, policyholder communication)
  - Creates underwriting cancellation activity in PolicyCenter
  - Compliance/Legal reviews to confirm grounds and ensure proper documentation
  - Cancellation notice is generated with reason (specific to underwriting issue)
  - Effective date follows state requirement (20-45 days depending on LOB and state)
  
- **Notice Requirements (by state):**
  - **Auto:** Typically 20-30 days advance notice
  - **Homeowners (property condition):** Typically 30-45 days advance notice
  - **Homeowners (other reasons):** Typically 30 days advance notice
  
  - **Colorado (NEW Mar 1, 2026):** Homeowners underwriting cancellation for property-condition-related reasons now requires **45 days** (increased from 30) (SB 23-287). All other UW cancellations remain 30 days.

- **State Variation Table (selected states):**

| State | Non-Payment Notice | UW Cancel Notice (Auto) | UW Cancel Notice (HO) |
|---|---|---|---|
| OH | 10 days | 30 days | 30 days |
| TX | 10 days | 30 days | 30 days |
| CA | 10 days | 20 days | 45 days |
| NY | 15 days | 30 days | 30 days |
| IL | 10 days | 30 days | 30 days |
| FL | 10 days | 20 days | N/A (no HO written) |
| **CT** | **15 days (NEW)** | 30 days | 30 days |
| **CO** | 10 days | 30 days | **45 days (NEW, property-condition only)** |

### 7.2 Cancellation Document Generation - Integration Point #6 (Revisited)

All cancellation types require regulatory notice generation via Thunderhead:

**VOLUNTARY CANCELLATION:**
- Cancellation confirmation (acknowledging policyholder's request)
- Refund information (if applicable)
- Effective date

**NON-PAYMENT CANCELLATION:**
- Cancellation notice with clear reason ("Premium payment not received")
- Notice period (e.g., "Policy will cancel on [date], 10 days from this notice")
- Instructions for payment to prevent cancellation
- Appeal rights
- Refund information (if applicable)

**UNDERWRITING CANCELLATION:**
- Formal cancellation notice with specific underwriting reason
- Notice period with legal language
- Appeal/reconsideration rights and process
- State-specific required language
- Refund information

**Template Coverage:** Meridian maintains 38-42 unique cancellation notice templates per LOB to accommodate state variations and cancellation types.

**Recent Compliance Issues:**
- Connecticut and Colorado templates were updated **after** regulatory changes took effect, leaving policies processed in early 2026 potentially non-compliant
- Meridian Compliance team has flagged these as HIGH and MEDIUM risk items, respectively
- Retroactive review of affected policies is in progress

### 7.3 Refund Processing - BillingCenter Integration

**Integration Point #5 (Revisited): PolicyCenter → BillingCenter**

When cancellation is finalized:
- PolicyCenter sends cancellation request to BillingCenter
- BillingCenter calculates refund based on:
  - Unused premium (if cancelled mid-term)
  - Payment method (mailed check vs. card reversal vs. ACH reversal)
  - Any pending charges or credits
- Refund is processed within 5-10 business days (varies by payment method and state requirements)

### 7.4 Cancel Stage Touchpoints

**Human Touchpoints:**
- **Policyholder initiates** (voluntary cancellation) or **fails to pay** (non-payment cancellation)
- **Underwriter identifies issue** (underwriting cancellation)
- **Operations team processes** cancellation, generates notices, manages appeals/disputes
- **Compliance team reviews** (especially underwriting cancellations, which have legal implications)

**Time to Cancel:**
- Voluntary (at policyholder request): Immediate if same-day cancellation requested; typically effective within 5-10 days
- Non-payment: 30-day grace period + 10-20 day notice period = 40-50 days minimum
- Underwriting: 20-45 day notice period (state dependent)

---

## 8. CRITICAL SYSTEM INTEGRATION POINTS & KNOWN ISSUES

### 8.1 Integration Catalog (12+ Points Identified)

| # | Source System | Target System | Direction | Protocol | Data Format | Frequency | Purpose | Known Issues |
|---|---|---|---|---|---|---|---|---|
| **1** | Agency AMS (Epic, HawkSoft) | PolicyCenter | → | REST API | ACORD XML v2.25 | Real-time | Submit new business quotes | None documented |
| **2** | Agency AMS (AMS360 legacy) | Legacy Mainframe PAS | → | SFTP batch | ACORD AL3 flat file | Nightly | Submit new business quotes (legacy AMS) | Legacy AMS platform; being phased out |
| **3** | PolicyCenter | Rating Engine | ↔ | REST API (sync) | ACORD XML v2.25 (request) | Per transaction | Premium calculation for quotes, endorsements, renewals | **~12% error rate: field mapping failures** (address truncation, multi-vehicle splits, scheduled items) — Fix proposed but not scheduled |
| **4** | Rating Engine | PolicyCenter | ↔ | REST API (sync) | ACORD XML v2.38 (response) | Per transaction | Calculated premium returned | **Version mismatch causes mapping errors** (see #3) |
| **5** | PolicyCenter | BillingCenter | ↔ | REST API | Guidewire internal format | Event-driven (bind, endorsement, renewal, cancel) | Create/update billing accounts, process premium adjustments, process refunds | Commission calc differs for migrated policies; duplicate schedules on reinstatement |
| **6** | PolicyCenter | Thunderhead / Smart Comms | → | Event-driven | XML document request | At issuance, endorsement, renewal, cancellation | Generate policy documents, dec pages, regulatory notices | Template maintenance overhead; 51-89 templates per LOB |
| **7** | PolicyCenter | ClaimCenter | → | REST API | Guidewire internal format | On-demand during FNOL | Policy verification — confirm active coverage | Depends on claims system; no known issues |
| **8** | ClaimCenter | PolicyCenter | → | Batch extract | CSV | Nightly (11 PM CT) | Claims history for renewal underwriting | Used only for renewal underwriting; policy-level view; no real-time claims visibility |
| **9** | Legacy Mainframe PAS | PolicyCenter | → | Batch via DataStage | EBCDIC flat file → UTF-8 XML | Nightly (2:00 AM CT) | Sync policy data from mainframe to PolicyCenter | **24-48 hour lag; 11 PM-2 AM transactions may miss window** |
| **10** | PolicyCenter | Legacy Mainframe PAS | → | Batch via DataStage | UTF-8 XML → EBCDIC flat file | Nightly (3:00 AM CT) | Sync policy data from PolicyCenter to mainframe (reconciliation) | **Reverse sync lag; data may not appear in mainframe until next night** |
| **11** | PolicyCenter | State DOI / NAIC / Data Warehouse | → | Batch extract | State-specific + CSV to Snowflake | Monthly/quarterly per state | Regulatory reporting (PCMI, SERFF, annual statements) | **~2% duplicate policies in warehouse; manual deduplication before NAIC submission** |
| **12** | BillingCenter | PolicyCenter | → | Event-driven | Guidewire internal event | On delinquency threshold (30+ days late) | Non-payment cancellation trigger | **Only reverse-direction integration from BillingCenter** |

### 8.2 Critical Issue Analysis

#### ISSUE A: ACORD XML Rating Engine Integration (~12% Error Rate)
**Integration Points #3-4**

**Problem:** The rating engine returns responses in ACORD XML v2.38, but PolicyCenter's inbound adapter expects v2.25. Three specific field mapping errors have been documented:

1. **Address Truncation:** v2.38 supports 60-character address fields, but adapter truncates to 30 characters
   - **Impact:** Address fields longer than 30 characters are corrupted
   - **Affects:** 10-15% of quotes with longer street addresses or apartment numbers

2. **Multi-Vehicle Premium Splits:** v2.38 response includes `VehiclePremiumDetail` element with per-vehicle premium breakdown, but adapter doesn't recognize element
   - **Impact:** Total premium is returned but per-vehicle breakdown is lost
   - **Affects:** All Auto quotes with 2+ vehicles (~30% of Auto quotes)

3. **Scheduled Personal Property Items:** v2.38 response includes `ScheduledItem` nested structure, but adapter maps items to wrong coverage code
   - **Impact:** Scheduled items (jewelry, art) are credited to wrong coverage, distorting premium breakdown
   - **Affects:** Homeowners quotes with scheduled items (~5% of HO quotes)

**Consequence:** Underwriting team manually re-enters data from rating engine responses into PolicyCenter. Approximately **4 hours per day** of aggregate team time is spent on this workaround. This is tracked as a pain point across Quote, Endorsement, and Renewal stages.

**Fix Status:**
- Root cause identified and documented in JIRA tickets RATE-1847 through RATE-1852
- Fix has been designed but not yet scheduled for implementation
- Requires coordination between:
  - Rating Engine operations team
  - PolicyCenter configuration team (Priya Nair)
  - Enterprise Data Architecture team (Nkechi Okafor)

**Recommendation:** Prioritize this fix as it directly impacts:
- Underwriting team efficiency (4 hours/day waste)
- Data accuracy (premium breakdowns)
- Operational risk (manual data entry creates audit/compliance exposure)
- Customer experience (quote turnaround time can extend when underwriter must manually verify)

#### ISSUE B: Nightly DataStage Sync Window Gap (Integrations #9-10)
**Integration Points #9-10: Mainframe ↔ PolicyCenter**

**Problem:** The DataStage middleware sync runs between 2:00-4:30 AM CT each night. However, transactions processed in either system between **11:00 PM and 2:00 AM CT may not be captured** in the current night's sync and won't appear in the other system until the following night's cycle.

**Consequence:**
- **For PolicyCenter transactions (11 PM-2 AM):** Changes don't appear in mainframe until next night (up to 24-hour lag)
- **For Mainframe transactions (11 PM-2 AM):** Changes don't appear in PolicyCenter until next night (up to 24-hour lag)
- **For cross-system reporting or reconciliation:** Transactions from the sync window gap create momentary inconsistencies

**Impact:** Low to moderate — mostly affects batch processes and reporting. Real-time queries would show system-specific view (would not see mainframe data in PolicyCenter until next sync, and vice versa).

**Workaround:** Most cross-system reconciliation and reporting is run AFTER 4:30 AM CT to ensure both systems have caught up to each other.

**Recommendation:** Acceptable as long as:
1. Operational procedures account for the sync window gap
2. Reports/extracts are always run after 4:30 AM CT
3. Documentation of expected lag times is clear to stakeholders

#### ISSUE C: Duplicate Policy Records in Data Warehouse (~2%)
**Integration Point #11: Data Warehouse**

**Problem:** Approximately 2% of policies that were in-flight during the Auto/Homeowners migration (3 years ago) appear as duplicate records in the Snowflake data warehouse. This occurs when:
1. Policy was extracted from mainframe before full migration to PolicyCenter
2. Same policy was also extracted from PolicyCenter (as migrated record)
3. Data warehouse ETL did not fully de-duplicate on business keys

**Consequence:**
- **NAIC Data Calls:** Before submitting data to NAIC (e.g., PCMI data call), Meridian must manually review and reconcile duplicate records. This adds 2-3 days of work before each quarterly NAIC submission.
- **Business Intelligence:** Duplicate policies can skew metrics (policy count, premium volume) if not filtered at query time
- **Audits:** Auditors may flag duplicate records as a data quality issue

**Scope:** Only affects policies that migrated 3 years ago. New policies written on PolicyCenter after migration are not affected.

**Recommendation:** 
- Identify the ~2% of duplicate-prone policies and implement ETL logic to always prefer PolicyCenter record (system of record)
- Accept that historical data (pre-migration) requires manual deduplication as a recurring data governance task

#### ISSUE D: Scheduled Personal Property Documentation Bottleneck (Homeowners Only)
**Integration Point #6: Document Management**

**Problem:** When a Homeowners policyholder adds scheduled personal property (jewelry, art, collections) via endorsement, the agent must upload a supporting appraisal document to PolicyCenter. This is a manual step that agents frequently forget.

**Consequence:**
- Endorsement processing delays (Operations team must follow up with agent to obtain appraisal)
- Approximately **1-2 business days delay** per affected endorsement
- Operations team spends time chasing missing documents instead of processing straightforward endorsements

**Scope:** Affects approximately 35% of Homeowners endorsements (those adding scheduled personal property)

**Recommendation:**
- Make appraisal document upload a required field in PolicyCenter before endorsement can be finalized (enforce at application layer)
- Provide agents with appraisal upload guidance/templates to streamline process
- Consider building integration with appraisal services to auto-fetch appraisals for high-value items

#### ISSUE E: Connecticut and Colorado Cancellation Notice Compliance Gap (Q1 2026)
**Integration Point #6: Document Generation**

**Problem:** Two states enacted regulatory changes to cancellation notice requirements that were not reflected in Meridian's automated templates until after the changes took effect:

1. **Connecticut (Effective Jan 1, 2026):**
   - Requirement changed from 10 days to 15 days for non-payment cancellation notices
   - Requirement added: notice must include Connecticut Insurance Department toll-free consumer hotline number
   - Meridian template was updated AFTER Jan 1
   - **Affected policies:** Approximately 45 non-payment cancellations processed in January-February may not have complied with new 15-day requirement

2. **Colorado (Effective Mar 1, 2026):**
   - Requirement changed from 30 days to 45 days for Homeowners underwriting cancellations involving property condition
   - Auto and non-property-related HO underwriting cancellations unchanged (remain 30 days)
   - Meridian template was updated AFTER Mar 1
   - **Affected policies:** Approximately 8-10 Homeowners underwriting cancellations processed since March 1 may not have complied with new 45-day requirement

**Consequence:**
- **Regulatory Risk:** Non-compliant notices could be challenged by policyholders, potentially voiding the cancellation
- **Audit Risk:** State Insurance Department could identify non-compliance during examination
- **Operational Risk:** Policies may need to be re-issued with proper notice periods

**Compliance Team Response:** (Source: Sarah Lindgren, VP Compliance, memo Feb 14, 2026)
- Templates have been updated
- Retroactive review of affected policies is underway
- Affected policyholders may require re-notification with corrected notice periods

**Root Cause:** Meridian lacks a formalized quarterly regulatory change monitoring process. Changes are currently caught ad hoc rather than systematically reviewed before effective dates.

**Recommendation:**
- Implement quarterly regulatory change review cycle (target: 90 days before state effective dates)
- Create pre-implementation testing environment to validate template changes
- Centralize regulatory requirement documentation (currently scattered across state-specific SharePoint sites)

### 8.3 Integration Landscape Diagram (Simplified)

```
┌──────────────────┐
│ Agency AMS       │ ← Epic, HawkSoft (modern)
│ Systems          │   AMS360 (legacy, phasing out)
└────────┬─────────┘
         │
    ┌────┼─────┬────────────────────────────────────┐
    │    │     │                                    │
    │    v     v (ACORD XML, real-time)             │
    │  ┌─────────────────┐            ┌──────────┐  │
    │  │   PolicyCenter  │──────────→ │ Rating   │  │
    │  │  (Auto, HO)     │ (ACORD XML │ Engine   │  │
    │  └─────────────────┘  request)  └──────────┘  │
    │    │                                │          │
    │    │  (Event-driven)           (ACORD XML)     │
    │    ├───────────────→ ┌──────────────────────┐  │
    │    │                 │ Thunderhead/Smart    │  │
    │    │                 │ Comms (Document Gen) │  │
    │    │                 └──────────────────────┘  │
    │    │                                            │
    │    ├───────────────→ ┌──────────────────────┐  │
    │    │ (REST API)      │   BillingCenter      │  │
    │    │                 │  (Billing & Payment) │  │
    │    │                 └──────────────────────┘  │
    │    │                          │                │
    │    │ (Reverse event trigger)  │                │
    │    │ ┌────────────────────────┘                │
    │    │ │                                         │
    │    │ v                                         │
    │  ┌─────────────────┐                           │
    │  │  ClaimCenter    │                           │
    │  │  (Claims mgmt)  │ ← (nightly extract)       │
    │  └─────────────────┘                           │
    │    │                                           │
    │    ├─ (batch export for regulatory)            │
    │    │                                           │
    │    v                                           │
    │  ┌─────────────────┐                           │
    │  │  Snowflake      │                           │
    │  │  Data Warehouse │                           │
    │  └─────────────────┘                           │
    │
    └─ (nightly DataStage sync) ──────────────────→ ┌──────────────────────┐
                                                     │ Legacy Mainframe PAS │
                                                     │ (Commercial, Life,   │
                                                     │  historical data)    │
                                                     └──────────────────────┘
```

---

## 9. AUTO vs HOMEOWNERS: LINE-OF-BUSINESS DIVERGENCES

While both Personal Auto and Homeowners follow the same six-stage lifecycle skeleton, they diverge in important ways at multiple stages:

### 9.1 QUOTE Stage Divergences

| Aspect | Auto | Homeowners |
|---|---|---|
| External data pulls | MVR (driver history) + CLUE (claims) | Protection class + Replacement cost estimate |
| Latency added | 5-10 seconds | 10-15 seconds |
| Rating complexity | Driver-level + vehicle-level factors | Property-level + location-level factors |
| Quote volume | Higher (more competitors, faster quote turnaround) | Lower (more complex, more review) |

### 9.2 BIND Stage Divergences

| Aspect | Auto | Homeowners |
|---|---|---|
| Auto-bind rate | ~65% | ~40% |
| Common referral triggers | DUI, 3+ accidents, youthful driver (<25) with no prior coverage | Roof age >20y, water damage history, pool/trampoline, Protection class 9-10, dwelling coverage >$750K |
| Manual review complexity | Lower (mostly underwriting rules engine) | Higher (property inspection often required) |
| Time to bind | 24-48 hours for manual review | 24-48 hours for underwriting; add 5-7 days for property inspection if required |

### 9.3 ENDORSEMENT Stage Divergences

| Aspect | Auto | Homeowners |
|---|---|---|
| Most common types | Add/remove driver (40%), add/remove vehicle (30%), coverage limit change (20%), garaging address change (10%) | Add/remove scheduled personal property (35%), dwelling coverage limit (25%), add optional coverage (20%), property characteristics (20%) |
| Always trigger re-rating? | **YES** — all endorsements re-rate | **Only if coverage or property characteristics change** |
| Documentation challenges | Minimal | **Scheduled personal property requires appraisal document upload** (agents frequently forget — causes delays) |
| Premium impact | Varies; adding youthful driver largest increase | Varies; scheduled property items = premium addition |

### 9.4 RENEWAL Stage Divergences

| Aspect | Auto | Homeowners |
|---|---|---|
| Renewal cycle | **6 months** | **12 months** |
| Frequency | 2× per year | 1× per year |
| Underwriter review triggers | Premium >15%, 3+ claims in 3 years | Premium >15%, 2+ water damage claims in 3 years, area changes |
| Non-renewal rate | Low (~2-3% of book annually) | Higher (~5-8% of book annually) |
| Claims sensitivity | Moderate (accidents, comprehensive losses) | High (water damage history heavily weighted) |

### 9.5 CANCELLATION Stage Divergences

| Aspect | Auto | Homeowners |
|---|---|---|
| Voluntary cancellation rate | ~60% | ~60% |
| Non-payment cancellation rate | ~35% | ~35% |
| Underwriting cancellation rate | Low (~0.5% annually) | Higher (~5% annually) |
| Underwriting cancellation reasons | Driver misrepresentation, undisclosed vehicles, business use | Property condition, roof condition, misrepresented characteristics, use as rental |
| Property inspection requirement | None (except high-value vehicles) | Yes, for underwriting cancellations involving property condition |

---

## 10. SYSTEM OWNERSHIP & CONTACTS

### 10.1 Key Personnel by Domain

| System / Function | Primary Contact | Title | Notes |
|---|---|---|---|
| **PolicyCenter** | Priya Nair | PolicyCenter Configuration Analyst | Joined Meridian specifically for Auto/HO migration 3 years ago; owns all PolicyCenter configuration |
| **Legacy Mainframe PAS** | Raj Krishnamurthy | Senior Mainframe Developer & Legacy PAS Team Lead | 22 years at Meridian; leads mainframe team; reports to VP Enterprise Systems |
| **Underwriting (Personal Lines)** | Diane Kowalski | Personal Lines Underwriting Manager | Oversees Auto/HO underwriting; 7 years at Meridian, 18 years in underwriting |
| **Policy Operations** | Marcus Bell | Policy Operations Supervisor | Leads 25-person team handling endorsements, cancellations, renewals; knows practical workflow pain points |
| **Enterprise Data Architecture** | Nkechi Okafor | Enterprise Data Architect | Joined 5 years ago for digital transformation; owns integration architecture and data standards |
| **Compliance & Regulatory** | Sarah Lindgren | VP of Compliance | Responsible for regulatory notices, rate filings, NAIC submissions |
| **BillingCenter** | Finance Technology Team | (Team contact via ServiceNow) | Manages premium billing and payment processing |
| **Rating Engine Operations** | Actuarial Technology Team | (Team contact via ServiceNow) | Manages rating engine deployments, rate table updates |

### 10.2 Access Requirements

**PolicyCenter Sandbox Access:** Submit request via IT Service Desk (ServiceNow)
- Category: "Guidewire Access Request"
- Turnaround: 2 business days
- Access includes read-only view of policies, test environment for configuration changes

**Mainframe Access:** Through mainframe team (Raj Krishnamurthy)
- Requires special security clearance
- Limited to data extracts and batch job monitoring
- No direct editing of COBOL programs (requires code review process)

---

## 11. RECOMMENDATIONS & FUTURE STATE

### 11.1 Immediate Priorities (Next 90 Days)

1. **Fix ACORD XML Rating Engine Integration (~12% error rate)**
   - Schedule implementation of fix for JIRA tickets RATE-1847 through RATE-1852
   - Coordinate across Rating Engine ops, PolicyCenter configuration, and Enterprise Data Architecture
   - Target: Reduce ~12% error rate to <1% and eliminate 4 hours/day manual re-entry

2. **Remediate Connecticut & Colorado Cancellation Notice Compliance Gaps**
   - Complete retroactive review of CT and CO policies processed in early 2026
   - Re-notify affected policyholders if necessary
   - Implement quarterly regulatory change monitoring process

3. **Enforce Homeowners Scheduled Personal Property Appraisal Documentation**
   - Update PolicyCenter UI to require appraisal document upload before endorsement finalization
   - Provide agents with appraisal templates and guidelines
   - Target: Eliminate 1-2 day delays on scheduled property endorsements

### 11.2 Medium-Term Improvements (6-12 Months)

1. **Cloud Migration of PolicyCenter** (planned for 2027)
   - Current version: Banff (Guidewire release 2 versions behind)
   - Plan cloud deployment as part of migration
   - Revisit integration architecture (potential for modern API gateway, ESB)

2. **Commercial Property Migration to PolicyCenter** (scheduled Q3 2026)
   - Will further concentrate workflow on PolicyCenter; mainframe becomes archive-only
   - Opportunity to consolidate templates, standardize processes across LOBs

3. **Real-Time DataStage Sync** (if Cloud migration enables)
   - Currently nightly batch; cloud deployment may support event-driven sync
   - Would eliminate 24-48 hour lag for cross-system transactions

### 11.3 Long-Term Architecture Evolution (12+ Months)

1. **Retire Legacy Mainframe PAS** (timeline: 3-5 years post-Commercial migration)
   - All active policies will be on PolicyCenter
   - Mainframe becomes historical archive and regulatory record
   - Simplifies integration landscape and eliminates DataStage middleware

2. **Unified API Gateway for All Integrations**
   - Consolidate point-to-point integrations (currently 12+ separate connections)
   - Standardize on REST/GraphQL for all internal and external systems
   - Enables better monitoring, versioning, and change management

3. **Advanced Analytics & Predictive Renewal Underwriting**
   - Use data warehouse more effectively to predict cancellations, non-renewals
   - Real-time claims data (currently nightly batch) would improve underwriting decisions
   - Machine learning models for risk assessment

---

## 12. CONCLUSION

Meridian Insurance's dual-PAS architecture creates operational complexity but reflects a pragmatic transition from legacy mainframe systems to modern cloud-based policy administration. The 12+ system integration points identified in this analysis represent the nerve system of the organization's policy lifecycle.

**Key takeaways:**

1. **Personal Auto and Homeowners follow a common lifecycle skeleton** (Quote → Bind → Issue → Endorse → Renew → Cancel) but diverge significantly in external data requirements, underwriting criteria, and endorsement types.

2. **Integration complexity is the primary source of operational pain:**
   - ACORD XML rating engine mapping errors (~12% of quotes) create ~4 hours/day of manual rework
   - Nightly DataStage sync creates 24-48 hour lags between mainframe and PolicyCenter
   - Document generation requires 51-89 state-specific templates
   - Scheduled personal property endorsements require manual appraisal uploads (agents frequently forget)

3. **Regulatory compliance requires constant attention:**
   - Recent changes in Connecticut and Colorado (early 2026) were not immediately reflected in cancellation notice templates
   - 51+ state-specific regulatory requirements must be maintained
   - Quarterly regulatory change monitoring process needs implementation

4. **The path forward involves modernization and consolidation:**
   - Commercial Property migration to PolicyCenter (Q3 2026) will further consolidate workflows
   - Cloud migration of PolicyCenter (2027) will enable real-time integrations and API consolidation
   - Eventual retirement of legacy mainframe will simplify architecture but requires detailed historical data preservation plan

This process map serves as the foundation for alignment discussions across IT, Operations, Underwriting, and Compliance teams on how data actually flows through Meridian's insurance administration systems—and where the pain points are that limit operational efficiency and customer experience.

---

## APPENDICES

### APPENDIX A: Policy Number Format Reference

| Line of Business | Format | Example | Notes |
|---|---|---|---|
| Personal Auto | PA-XXXXXXX | PA-3847201 | 7-digit numeric suffix; assigned sequentially at issuance |
| Homeowners | HO-XXXXXXX | HO-2195438 | 7-digit numeric suffix; assigned sequentially at issuance |
| Commercial Property | CP-XXXXXXX | CP-1234567 | (On mainframe; will migrate to PolicyCenter Q3 2026) |
| General Liability | GL-XXXXXXX | GL-7654321 | (On mainframe) |
| Life Insurance | LF-XXXXXXX | LF-2468135 | (On mainframe) |

### APPENDIX B: State Cancellation Notice Requirements Reference (Sample)

Full matrix available on Compliance SharePoint. Selected states shown:

| State | Non-Payment Notice Period | UW Cancel (Auto) | UW Cancel (HO) | Non-Renewal |
|---|---|---|---|---|
| **OH** | 10 days | 30 days | 30 days | 30 days |
| **TX** | 10 days | 30 days | 30 days | 60 days |
| **CA** | 10 days | 20 days | 45 days | 45 days |
| **NY** | 15 days | 30 days | 30 days | 45 days |
| **IL** | 10 days | 30 days | 30 days | 30 days |
| **FL** | 10 days | 20 days | N/A | 45 days |
| **CT** | 15 days (NEW Jan 1) | 30 days | 30 days | 60 days |
| **CO** | 10 days | 30 days | 45 days (NEW Mar 1, property condition only) | 30 days |

### APPENDIX C: Document Count by System

| System | Document Type | Count | Notes |
|---|---|---|---|
| **PolicyCenter** | Auto dec page templates | 51 | One per state + DC + territories |
| **PolicyCenter** | Auto notice templates | 38 | Cancellation, non-renewal, conditional renewal |
| **PolicyCenter** | Homeowners dec page templates | 47 | 46 states + DC (no FL/LA) |
| **PolicyCenter** | Homeowners notice templates | 42 | Cancellation, non-renewal, conditional renewal, wind/hail exclusions |
| **Mainframe** | Generic templates (all LOBs) | 5 | Legacy; not state-specific; last redesigned 8 years ago |
| **Total Active** | (Excluding mainframe) | 178 | PolicyCenter-based templates |

### APPENDIX D: External Data Latencies

| Data Source | LOB | Latency | Updated Frequency | Source |
|---|---|---|---|---|
| **MVR** (Motor Vehicle Record) | Auto | 5-10 sec | Per quote | State DMV systems |
| **CLUE** (Claims History) | Auto | 5-10 sec | Per quote | LexisNexis/ChoicePoint |
| **Protection Class** | Homeowners | 10-15 sec | Per quote | ISO rating database |
| **Replacement Cost Estimate** | Homeowners | 10-15 sec | Per quote | CoreLogic |
| **Claims Data** | Both | Nightly batch | Nightly (11 PM CT) | ClaimCenter extract to PolicyCenter |
| **Rate Tables** | Both | As filed | Per DOI approval | Rating Engine updates |

### APPENDIX E: Integration Protocols & Technologies

| Protocol/Technology | Used For | Examples | Notes |
|---|---|---|---|
| **REST API (Synchronous)** | Real-time, point-to-point | PolicyCenter↔Rating Engine, PolicyCenter↔BillingCenter | Industry standard; low latency (1-3 sec) |
| **REST API (Event-Driven)** | Asynchronous workflows | PolicyCenter→Thunderhead (document generation), BillingCenter→PolicyCenter (cancellation trigger) | Decouples systems; better fault tolerance |
| **SOAP (Legacy)** | Legacy system interface | Mainframe CICS web services | Older protocol; still used for mainframe integrations |
| **Batch Files (SFTP)** | High-volume asynchronous | Agency AMS360→Mainframe (ACORD AL3), DataStage sync (EBCDIC flat files) | Reliable; high latency (nightly) |
| **ACORD XML** | Insurance industry standard | Rating requests/responses, agency submissions | v2.25 used in PolicyCenter; v2.38 used in rating engine (version mismatch → 12% errors) |
| **CSV Batch Extract** | Data warehouse & reporting | ClaimCenter→PolicyCenter (nightly claims), PolicyCenter→Snowflake (regulatory), etc. | Simple; reliable; suitable for nightly batch |

### APPENDIX F: Known JIRA Tickets (Rating Engine Integration)

| Ticket | Title | Priority | Status | Estimated Fix |
|---|---|---|---|---|
| RATE-1847 | ACORD XML Address Field Truncation (30 vs 60 character limit) | High | Proposed, not scheduled | TBD |
| RATE-1848 | Multi-vehicle Premium Detail Element Not Recognized | High | Proposed, not scheduled | TBD |
| RATE-1849 | Scheduled Personal Property Item Mapping to Wrong Coverage Code | High | Proposed, not scheduled | TBD |
| RATE-1850 | ACORD XML v2.38 Response Mapping | High | Proposed, not scheduled | TBD |
| RATE-1851 | Version Mismatch Root Cause Analysis | High | Completed | Fix pending implementation |
| RATE-1852 | Impact Assessment: ~12% Quote Error Rate | High | Completed | Quantified at ~4 hours/day manual rework |

---

## DOCUMENT HISTORY

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | April 2026 | Insurance Systems Mapping Team | Initial comprehensive lifecycle map; 12+ integration points identified; Auto/Homeowners divergences documented |

---

**END OF DOCUMENT**

Sources: Meridian Insurance Wiki (13 pages), Integration Landscape Architecture (Nkechi Okafor), Cancellation Notice Compliance Memo (Sarah Lindgren, Feb 14, 2026), Sample Policy Datasets (Auto & Homeowners), Guidewire PolicyCenter Configuration Team (Priya Nair)
