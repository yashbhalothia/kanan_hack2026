# Student Document Vault & Instant Verifier (HACK2026)

## 🛡️ Mission: Privacy-First Verification
This project is a high-speed, "Zero-Storage" document verification hub designed for the HACK2026 Track 02. We solve the primary friction in student applications: the fear of data leaks. By utilizing **On-the-Fly OCR**, our system verifies document authenticity and identity matching in volatile memory—ensuring student data is processed but never permanently stored or leaked.

## ⚡ Core Advantages
- **Hyper-Speed:** Real-time data extraction and matching using an optimized OCR logic engine.
- **Privacy-Centric:** No database, no cloud storage, no persistent logs. Files are verified and then purged from the server immediately.
- **Identity Integrity:** Automatic cross-referencing between user-provided personal details and document metadata.

## 🛠️ The Logic Engine (Comprehension)
The system operates on a **Match & Purge** architectural flow:
1. **Input:** User enters their official name/details and uploads a document (e.g., Marksheet).
2. **Extraction:** Simple OCR parses the image for "Data Blocks" (Names, Marks, Institution Headers).
3. **Validation:**
   - **Type Check:** Identifies the document type based on keyword density (e.g., "Statement of Marks" = Marksheet).
   - **Identity Match:** Compares the extracted "Name" field against the user's provided profile. 
4. **Verification:** - If **Match == True**: Document is marked as Verified.
   - If **Match == False**: Document is Rejected.
5. **Session Export:** Verified files are moved to a temporary "Vault" tab where users can download their verified bundle before the session ends.

## 💎 Visual Experience
Designed with **Minimalist Glassmorphism** to reflect a clean, transparent, and modern industrial aesthetic.
- **Backdrop Blurs:** High-fidelity UI using Tailwind `backdrop-blur` utilities.
- **Status HUD:** Instant visual feedback (Verified/Rejected) with subtle glow effects.
- **The Vault:** A dedicated sidebar/tab to manage and download verified assets without server-side saves.
