# GHL Fields to Fix - Wrong Unique Keys, Duplicates, and Typos

## Fields with Wrong/Ambiguous Unique Keys

### 1. Will The Client Be Able To Join The Meeting?
- **Current Unique Key:** `radio_1dx8_bk0_copy`
- **Type:** RADIO
- **Issue:** Generic key name doesn't describe the field
- **Recommended Key:** `will_the_client_be_able_to_join_the_meeting`

---

### 2. Can You Confirm That The Client Is Of Sound Mind To Understand The Conversation And Make Their Own Decisions? And To Your Knowledge, Do They Have Any Cognitive Issues That Might Affect This?
- **Current Unique Key:** `radio_1dx8_bk0_copy_mc3_copy`
- **Type:** RADIO
- **Issue:** Generic key name with random suffix
- **Recommended Key:** `client_is_of_sound_mind_to_make_decisions`

---

### 3. To Help Match You With The Right Attorney, Would You Say Your Net Worth Is Over $5 Million If Single—Or $10 Million If Married?
- **Current Unique Key:** `if_you_are_looking_for_updates_we_will_need_a_copy_of_your_will_trust_atleast_2_days_before_your_appointment_can_you_send_them_electronically_3xc_copy`
- **Type:** RADIO
- **Issue:** Key describes a COMPLETELY DIFFERENT field about document copies
- **Recommended Key:** `net_worth_over_5m_single_or_10m_married`

---

### 4. Are You The PR?
- **Current Unique Key:** `was_there_a_will_7rh_copy`
- **Type:** RADIO
- **Issue:** Key suggests "was there a will" question instead of PR question
- **Recommended Key:** `are_you_the_pr`

---

### 5. Are You The Successor Trustee?
- **Current Unique Key:** `are_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_ug7_copy`
- **Type:** RADIO
- **Issue:** Key describes asset ownership question instead of trustee question
- **Recommended Key:** `are_you_the_successor_trustee`

---

### 6. For The Assets That Are Owned Individually, Are There Listed Beneficiaries?
- **Current Unique Key:** `are_all_the_assets_owned_individually_by_the_decedent_or_are_they_in_a_trust_x5p_copy`
- **Type:** RADIO
- **Issue:** Key describes different asset question instead of beneficiaries question
- **Recommended Key:** `are_there_listed_beneficiaries_for_individual_assets`

---

## Duplicate Fields

### Spouse Email Duplicate
- **Field 1:** Spouse's Email
  - **Unique Key:** `spouses_email`
  - **Type:** TEXT

- **Field 2:** Spouse Email
  - **Unique Key:** `spouse_email`
  - **Type:** TEXT

**Resolution:** Keep ONE field `spouse_email` (without possessive), delete the other

---

## Typos

### Property Address Fields
All three property address fields have "Poperty" instead of "Property":

1. **Poperty address 1**
   - **Unique Key:** `poperty_address_1`
   - **Type:** TEXT

2. **Poperty address 2 (if applicable)**
   - **Unique Key:** `poperty_address_2_if_applicable`
   - **Type:** TEXT

3. **Poperty address 3 (if applicable)**
   - **Unique Key:** `poperty_address_3_if_applicable`
   - **Type:** TEXT

**Resolution:** Fix the survey/form source to use "Property" correctly, OR keep GHL keys as is to match webhook data
