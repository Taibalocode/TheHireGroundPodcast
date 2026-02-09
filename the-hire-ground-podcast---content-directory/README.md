
# The Hire Ground Podcast - Content Directory (v1.21)

A high-performance, AI-driven content management system (CMS) and discovery engine for **The Hire Ground Podcast**. This platform bridges the gap between unstructured YouTube/Spotify media and structured, searchable career intelligence for students and professionals.

---

## 🌟 Core Functionality

### 1. Semantic Discovery (AI Search)
Unlike standard keyword search, this directory uses **Gemini 3 Pro** to understand user intent.
*   **Contextual Queries**: Users can ask natural language questions like *"How do I prep for a tech interview?"* or *"Help me find sales roles for new grads."*
*   **Reasoning**: The AI analyzes headlines, guest profiles, and full descriptions across the entire library to rank relevance, even if the exact words don't match.

### 2. Multi-Faceted Filtering
*   **Job Profiles**: Filter by specific career paths (e.g., *CEO, Consultant, Salesperson*).
*   **Topics**: Targeted tags such as *Interviewing, Networking, Salary Negotiation*.
*   **Content Type**: Toggle between **YouTube Shorts** (quick tips) and **Full Episodes** (deep dives).

### 3. Automated Data Hygiene
*   **Smart Standardization**: All incoming data (from AI, CSV, or manual entry) is automatically converted to **Title Case** (e.g., "software engineer" → "Software Engineer").
*   **Acronym Awareness**: The system intelligently preserves capitalization for known terms like *CEO, CTO, AI, SaaS,* and *HR*, ensuring professional consistency without manual editing.
*   **Deduplication**: Tags like "sales", "Sales", and "SALES" are merged into a single canonical tag.

---

## 🚀 User Journeys

### 1. The Viewer Journeys (Discovery)

#### **The "I Need Answers" Path (Semantic Search)**
*   **Context**: A student is nervous about their first big networking event.
*   **Journey**: They type *"How do I talk to alumni at a career fair?"* into the Gemini search bar.
*   **Outcome**: The system returns the "Networking Secrets" episode and relevant "Shorts" on icebreakers, even if the title doesn't contain the exact phrase "career fair."

#### **The "Format First" Path (Faceted Filtering)**
*   **Context**: A busy recruiter only has 5 minutes between calls.
*   **Journey**: They toggle the **Shorts Only** filter and select the **Recruiter** profile.
*   **Outcome**: They get a curated grid of 60-second industry tips specifically relevant to their professional background.

#### **The "Platform Switch" Path**
*   **Context**: A user starts watching a video on the train but loses signal.
*   **Journey**: They click the **Spotify** icon on the video card.
*   **Outcome**: They are seamlessly routed to the audio episode to continue listening offline.

---

### 2. The Admin Journeys (Management)

#### **The "Single Episode Onboarding" Path**
*   **Context**: A new episode just went live on YouTube.
*   **Journey**: Admin toggles **Admin Mode** -> **Add Content** -> Pastes the URL -> Clicks **Auto-Generate Metadata**.
*   **Outcome**: Gemini 3 Flash extracts the Guest Name, Headline, and Tags. The Admin reviews, clicks **Save**, and the directory is instantly updated for all users.

#### **The "Backlog Ingestion" Path (Bulk Import)**
*   **Context**: The team has a text list of 50 past episodes.
*   **Journey**: Admin goes to **Bulk Import** -> Pastes the entire text block.
*   **Outcome**: The AI parses the text, extracts YouTube IDs and Titles for all 50 items, and adds them to the database in a single batch.

#### **The "Publishing" Path (Deployment)**
*   **Context**: The Admin has made several changes and wants to push them live.
*   **Journey**: Admin clicks **Publish** -> Downloads `seedData.ts`.
*   **Outcome**: The Admin replaces the `seedData.ts` file in the source code repository with this new file and deploys the app.

---

## 🛠 Administrative Power Tools (Admin Mode)

Accessible via the "Admin Login" toggle, this restricted section allows for complete catalog management.

### Content Ingestion Workflows
1.  **AI-Assisted Single Entry**: Admins provide a URL, and Gemini 3 Flash generates all metadata, tags, and headlines.
2.  **Bulk AI Import**: Paste unstructured text, and the AI structures multiple episodes into valid database records.
3.  **Full-Fidelity CSV Import**: Upload standard CSV files to ensure all 12 metadata fields are restored accurately.
4.  **System Documentation**: Exclusive access to the technical "Docs" tab.

---

## 💾 Data Architecture & Resilience

The platform uses a **Persistent-First** storage model to ensure zero data loss without a dedicated backend.

### 3-Layer Storage Model
Updates are synced across:
1.  **Primary (`localStorage`)**: Main source of truth.
2.  **Redundancy (`localStorage_BAK`)**: Identical clone for recovery.
3.  **Session Cache (`sessionStorage`)**: Temporary buffer that allows the system to "self-heal" the database if primary storage is wiped.

### Backup & Restore
*   **JSON Snapshot**: Full system backup including logs.
*   **Full Data CSV**: Human-readable export with 12 structured fields for spreadsheet editing.
*   **Factory Reset**: Secure option to restore the original seed library from `seedData.ts`.

---

## 📊 CSV Schema (12 Fields)

1. **YouTube ID** | 2. **Title** | 3. **Headline** | 4. **Full Description** | 5. **Guest Name** | 6. **Profiles** | 7. **Target Audience** | 8. **Topics** | 9. **Transcript** | 10. **Published Date** | 11. **Is Short** | 12. **Spotify URL**

---

## 🔒 Security & Privacy
*   **Documentation Visibility**: System docs are restricted to Admin Mode.
*   **Thumbnail Reliability**: Displays a "Thumbnail Pending" image if YouTube ID is missing or invalid.
*   **Data Privacy**: All activity and data remain in the user's browser storage.