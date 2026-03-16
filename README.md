# Student Application & Document Verification System (HACK2026)

## 🚀 Mission Overview
This project is a high-fidelity, secure digital hub designed for students navigating the study abroad process. It solves the friction of manual document review by implementing a **Logic-Driven OCR Verification Engine**. Unlike a simple cloud storage solution, this system actively parses uploaded documents to verify authenticity and ensure all mandatory data points are present.

## 🛠️ Tech Stack
- **Frontend:** React.js + Tailwind CSS (Minimalist Glassmorphism UI)
- **Backend:** Node.js + Express
- **Core Engine:** OCR-based Data Extraction & Verification
- **Icons:** Lucide-React

## 🧠 The Verification Logic (Comprehension)
The system uses OCR to scan documents and look for specific "Data Blocks" required for a successful application. It doesn't just check if a file exists; it checks if the *content* is valid.

### Document-Specific Extraction:
* **Passport:** The engine extracts the **Passport Number**, **Expiry Date**, and **Full Name**. It triggers an alert if the expiry date is within 6 months.
* **Academic Transcripts:** Scans for **Institution Name**, **CGPA/Grades**, and **Official Seals**.
* **Financial Statements:** Verifies the **Account Holder's Name** and **Closing Balance** to ensure it meets minimum visa requirements.

## 💎 Features
- **Minimalist Glassmorphism UI:** A sleek, translucent interface designed for a modern "Industrial" aesthetic.
- **Triggered Logic Notifications:** Real-time feedback if a document is blurry, expired, or missing specific required fields.
- **Dynamic Progress Tracker:** A vertical stepper that updates as the OCR engine confirms each document's validity.

## ⚙️ Setup & Installation

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
