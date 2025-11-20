# New GHL Custom Fields to Create

Last Updated: 2025-11-21

## Overview
This document lists all new custom fields that need to be created in GoHighLevel for the JotForm Intake Form integration.

---

## 🔍 Duplicate JotForm Field IDs Found

| Field Name | Duplicate IDs | Resolution |
|------------|--------------|------------|
| **What documents do you have?** | `whatDocuments` (original)<br>`whatDocuments2` (updated) | Use `whatDocuments2` for the new field mapping |
| **Are you a Florida Resident?** | `floridaResident` (general intake)<br>`docFloridaResident` (doc review) | Both map to same GHL field: `contact.are_you_a_florida_resident` |

### ⚠️ Action Required
- Verify JotForm uses `whatDocuments2` in the actual webhook payload
- Confirm `floridaResident` and `docFloridaResident` are the same question in different forms

---

## ✅ Custom Fields to Create in GHL

### 1. Asset Ownership Variant
**Field Name:** Are all the assets owned individually by the decedent or are they in a trust? (Variant 2)
**Field Key:** N/A - Using existing field
**Data Type:** RADIO

**JotForm Mapping:**
- `assetOwnership` → `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust`
- `assetOwnership2` → `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust`

**Notes:** Both JotForm fields map to the same existing GHL field.

**✅ DECISION:** Do NOT create new field. Use existing `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust`

---

### 2. Referral Fields
**Field Name:** N/A - Using existing fields
**Field Key:** N/A

**JotForm Mapping:**
- `Referral` → `contact.lead_source`
- `referralOthers` → `contact.lead_source` (append value or store in referrers_name if specific person mentioned)

**✅ DECISION:** Do NOT create new fields. Map both to existing `contact.lead_source` field. If "Others" contains a specific person's name, also populate `contact.referrers_name`

---

### 3. Caller's Phone Number
**Field Name:** Caller's Phone Number
**Field Key:** `contact.callers_phone_number`
**Data Type:** TEXT
**JotForm Mapping:** `callersPhone`
**Notes:** For when caller ≠ client

---

### 4. Caller's Email
**Field Name:** Caller's Email
**Field Key:** `contact.callers_email`
**Data Type:** TEXT
**JotForm Mapping:** `callersEmail`
**Notes:** For when caller ≠ client

---

### 5. Estate Planning Goals
**Field Name:** Estate Planning Goals
**Field Key:** `contact.estate_planning_goals`
**Data Type:** LARGE_TEXT
**JotForm Mapping:** `estatePlan`
**Question:** "What would you like to get out of your estate plan?"
**Notes:** Key intake question for understanding client objectives

---

### 6. What Documents Do You Have (List)
**Field Name:** What Documents Do You Have
**Field Key:** `contact.what_documents_do_you_have`
**Data Type:** LARGE_TEXT
**JotForm Mapping:** `whatDocuments2`
**Notes:** Free-form list of existing documents client has

---

### 7. Legal Advice Sought
**Field Name:** Legal Advice Sought
**Field Key:** `contact.legal_advice_sought`
**Data Type:** LARGE_TEXT
**JotForm Mapping:** `legalAdvice`
**Question:** "What legal advice or guidance are you seeking?"
**Notes:** Doc review form specific

---

### 8. Recent Life Events
**Field Name:** Recent Life Events
**Field Key:** `contact.recent_life_events`
**Data Type:** LARGE_TEXT
**JotForm Mapping:** `lifeEvent`
**Question:** "Have there been any recent life changes or events that led you to reach out?"
**Notes:** Provides context for consultation timing

---

### 9. Are You The Document Owner
**Field Name:** Are You The Document Owner
**Field Key:** `contact.are_you_the_document_owner`
**Data Type:** RADIO
**Options:**
- Yes
- No

**JotForm Mapping:** `documentOwner`
**Notes:** Doc review form specific

---

### 10. Relationship With Document Owners
**Field Name:** Relationship With Document Owners
**Field Key:** `contact.relationship_with_document_owners`
**Data Type:** TEXT
**JotForm Mapping:** `relationshipWithDocOwners`
**Notes:** Only relevant when documentOwner = No

---

### 11. Are You A Beneficiary Or Trustee
**Field Name:** Are You A Beneficiary Or Trustee
**Field Key:** `contact.are_you_a_beneficiary_or_trustee`
**Data Type:** RADIO
**Options:**
- Beneficiary
- Trustee
- Both
- Neither

**JotForm Mapping:** `beneficiaryOrTrustee`
**Notes:** Doc review form specific

**✅ DECISION:** CREATE new field as requested

---

### 12. Power of Attorney (POA)
**Field Name:** Power of Attorney (POA)
**Field Key:** `contact.power_of_attorney_poa`
**Data Type:** RADIO
**Options:**
- Yes
- No

**JotForm Mapping:** `poa`
**Question:** "Do you have a Power of Attorney authorizing you to make changes?"
**Notes:** Doc review form specific

---

### 13. Pending Litigation
**Field Name:** Pending Litigation
**Field Key:** `contact.pending_litigation`
**Data Type:** RADIO
**Options:**
- Yes
- No

**JotForm Mapping:** `pendingLitigation`
**Question:** "Is there any pending litigation related to the estate/trust?"
**Notes:** Critical for attorney conflict check

---

## 📊 Summary

### Fields to CREATE (11 new fields):
1. ~~Asset Ownership Variant 2~~ ❌ Use existing field `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust`
2. ~~How Did You Hear About Us~~ ❌ Use existing `contact.lead_source`
3. ~~Referral - Other Details~~ ❌ Use existing `contact.lead_source`
4. **Caller's Phone Number** ✅ CREATE
5. **Caller's Email** ✅ CREATE
6. **Estate Planning Goals** ✅ CREATE
7. **What Documents Do You Have** ✅ CREATE
8. **Legal Advice Sought** ✅ CREATE
9. **Recent Life Events** ✅ CREATE
10. **Are You The Document Owner** ✅ CREATE
11. **Relationship With Document Owners** ✅ CREATE
12. **Are You A Beneficiary Or Trustee** ✅ CREATE
13. **Power of Attorney (POA)** ✅ CREATE
14. **Pending Litigation** ✅ CREATE

**Total New Fields to Create: 11**

---

## 🎯 Field Mappings Using Existing Fields

| JotForm Field ID | Use Existing GHL Field | Field Key |
|-----------------|------------------------|-----------|
| `assetOwnership` | Are all the assets owned individually... | `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust` |
| `assetOwnership2` | Are all the assets owned individually... | `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust` |
| `Referral` | Lead Source | `contact.lead_source` |
| `referralOthers` | Lead Source | `contact.lead_source` |

---

## ✅ Action Items

1. **Review this document** - Confirm all fields are needed
2. **Approve field creation** - Confirm the 11 new fields should be created
3. **Verify field mappings** - Confirm existing field reuse is acceptable
4. **Create fields in GHL** - Use API to create the approved fields
5. **Update mapping documentation** - Reflect final field decisions

---

## 🔧 API Payload Preview

Once approved, fields will be created using this structure:

```json
{
  "name": "Caller's Phone Number",
  "fieldKey": "contact.callers_phone_number",
  "dataType": "TEXT",
  "model": "contact",
  "locationId": "afYLuZPi37CZR1IpJlfn"
}
```

---

## ✅ Decisions Made

1. **Asset Ownership:** ✅ Both `assetOwnership` and `assetOwnership2` map to existing `contact.are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust`
2. **Referral fields:** ✅ Both `Referral` and `referralOthers` map to `contact.lead_source`
3. **Beneficiary/Trustee:** ✅ Create new field "Are You A Beneficiary Or Trustee"
4. **Total fields to create:** ✅ 11 new custom fields
