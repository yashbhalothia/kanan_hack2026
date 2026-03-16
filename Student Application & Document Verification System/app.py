"""
==========================================================
  Student Application & Document Verification System
  ---------------------------------------------------
  A Flask web application that allows students to upload
  documents (Passport, Marksheet, Visa), extracts text
  using the OCR.space API, and verifies whether required
  keywords are present in the uploaded documents.

  Features:
    - Personal details with name cross-check
    - File upload with type/size validation
    - OCR text extraction via OCR.space API
    - Keyword-based document verification
    - Session-based tracking of uploaded documents
    - Verified file caching & download
    - Missing document detection before final submission
==========================================================
"""

import os
import uuid
import shutil
import requests
from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    session,
    send_file,
)

# ---------------------
#  App Configuration
# ---------------------
app = Flask(__name__)

# Secret key for session management
app.secret_key = "student_verification_secret_key_123"

# OCR.space API configuration
OCR_API_URL = "https://api.ocr.space/parse/image"
OCR_API_KEY = "K85573466888957"

# Maximum allowed file size: 5 MB
MAX_FILE_SIZE = 5 * 1024 * 1024

# Allowed image file extensions for upload
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp", "tiff", "pdf"}

# Directory to cache verified files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------------
#  Required Documents
# ---------------------
REQUIRED_DOCS = ["Passport", "High School Marksheet", "Visa"]


# ===========================
#  Helper Functions
# ===========================

def allowed_file(filename):
    """Check whether the uploaded file has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def call_ocr_api(file_storage):
    """
    Send an image file to the OCR.space API and return the extracted text.
    """
    try:
        payload = {
            "apikey": OCR_API_KEY,
            "language": "eng",
            "isOverlayRequired": False,
            "OCREngine": 1,
        }

        response = requests.post(
            OCR_API_URL,
            files={"file": (file_storage.filename, file_storage.stream, file_storage.mimetype)},
            data=payload,
            timeout=90,
        )

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"OCR API returned HTTP status {response.status_code}. "
                         "Please check your API key or try again later.",
            }

        result = response.json()

        if result.get("IsErroredOnProcessing", False):
            error_msg = result.get("ErrorMessage", ["Unknown OCR processing error."])
            if isinstance(error_msg, list):
                error_msg = " ".join(error_msg)
            return {"success": False, "error": error_msg}

        parsed_results = result.get("ParsedResults", [])
        if not parsed_results:
            return {
                "success": False,
                "error": "No text could be extracted. The image may be too blurry "
                         "or does not contain readable text.",
            }

        first_result = parsed_results[0]
        exit_code = first_result.get("FileParseExitCode", -1)

        if exit_code != 1:
            error_detail = first_result.get(
                "ParsedTextErrorDetails", "The image could not be parsed."
            )
            return {
                "success": False,
                "error": f"OCR parsing failed: {error_detail}",
            }

        extracted_text = first_result.get("ParsedText", "")
        if not extracted_text.strip():
            return {
                "success": False,
                "error": "OCR returned empty text. The image may be blank or unreadable.",
            }

        return {"success": True, "text": extracted_text}

    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "The OCR API request timed out. Please try again.",
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Could not connect to the OCR API. Please check your internet connection.",
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"An unexpected network error occurred: {str(e)}",
        }
    except ValueError:
        return {
            "success": False,
            "error": "Invalid response from OCR API. The response was not valid JSON.",
        }


def check_keywords(text):
    """
    Check the extracted OCR text for required document keywords.
    """
    text_lower = text.lower()

    keyword_groups = {
        "Passport": [
            "passport", "republic of india", "issuing authority",
            "place of issue", "date of expiry", "given name",
            "surname", "p a s s p o r t", "type/type", "code/code"
        ],
        "High School Marksheet": [
            # General marksheet terms
            "marksheet", "mark sheet", "statement of marks",
            "certificate of examination", "passing certificate",
            "board of education", "secondary school", "higher secondary",
            "senior secondary", "intermediate examination",
            "annual examination", "class xii", "class 12", "12th standard",
            "roll no", "marks obtained",
            # National boards
            "central board", "cbse", "c.b.s.e",
            "cisce", "icse", "isc", "council for the indian school certificate",
            "nios", "national institute of open schooling",
            # State boards
            "state board",
            "maharashtra state board", "msbshse",
            "uttar pradesh board", "upmsp",
            "bihar board", "bseb",
            "madhya pradesh board", "mpbse",
            "rajasthan board", "rbse", "bser",
            "karnataka board", "kseab", "pue board karnataka",
            "tamil nadu board", "tn board", "hsc tamil nadu",
            "kerala board", "dhse kerala",
            "west bengal board", "wbchse", "wbbse",
            "gujarat board", "gseb", "gshseb",
            "andhra pradesh board", "bieap",
            "telangana board", "bie telangana", "tsbie",
            "odisha board", "bse odisha", "chse odisha",
            "assam board", "ahsec", "seba assam",
            "chhattisgarh board", "cgbse",
            "jharkhand board", "jac", "jharkhand academic council",
            "haryana board", "bseh",
            "punjab board", "pseb",
            "goa board", "gbshse",
            "uttarakhand board", "ubse",
            "himachal pradesh board", "hpbose",
            "jammu and kashmir board", "jkbose",
            "manipur board", "cohsem",
            "meghalaya board", "mbose",
            "mizoram board", "mbse mizoram",
            "nagaland board", "nbse",
            "tripura board", "tbse",
            "sikkim board",
            "arunachal pradesh board",
            # International boards recognized in India
            "international baccalaureate", "ib diploma",
            "cambridge", "igcse", "caie",
        ],
        "Visa": [
            "travel visa", "entry clearance", "residence permit",
            "multiple entry", "single entry", "visa type", "visa class",
            "category: d", "f-1 visa", "student visa"
        ],
    }

    found_categories = []

    for category, keywords in keyword_groups.items():
        for keyword in keywords:
            if keyword in text_lower:
                found_categories.append(category)
                break

    return {
        "verified": len(found_categories) > 0,
        "found": found_categories,
        "doc_type": found_categories[0] if found_categories else "Unknown",
    }


def check_name_in_text(name, text):
    """
    Check if the user's name appears in the OCR-extracted text.
    Uses case-insensitive matching. Also checks individual name parts
    (first name, last name) for partial matching.

    Args:
        name (str): The user's full name
        text (str): The OCR-extracted text

    Returns:
        bool: True if the name (or significant parts) is found in the text
    """
    if not name or not text:
        return False

    text_lower = text.lower().strip()
    name_lower = name.lower().strip()

    # Check full name
    if name_lower in text_lower:
        return True

    # Check individual name parts (e.g. first name and last name)
    name_parts = name_lower.split()
    if len(name_parts) >= 2:
        # If at least 2 parts of the name are found, consider it a match
        matches = sum(1 for part in name_parts if len(part) > 1 and part in text_lower)
        if matches >= 2:
            return True

    # Check if first or last name alone is found (for single-name documents)
    if len(name_parts) >= 1:
        # Match the longest name part
        longest_part = max(name_parts, key=len)
        if len(longest_part) >= 3 and longest_part in text_lower:
            return True

    return False


def get_missing_docs():
    """
    Compare required documents against what the student has uploaded.
    """
    uploaded = session.get("uploaded_docs", [])
    missing = [doc for doc in REQUIRED_DOCS if doc not in uploaded]
    return missing


def save_verified_file(file_storage, doc_type):
    """
    Save a verified file to the uploads directory and return its ID.
    """
    file_id = str(uuid.uuid4())
    ext = file_storage.filename.rsplit(".", 1)[1].lower() if "." in file_storage.filename else "bin"
    safe_filename = f"{file_id}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)

    # Reset stream position and save
    file_storage.stream.seek(0)
    file_storage.save(filepath)

    return {
        "file_id": file_id,
        "original_name": file_storage.filename,
        "saved_name": safe_filename,
        "doc_type": doc_type,
    }


# ===========================
#  Flask Routes
# ===========================

@app.route("/")
def index():
    """Serve the main frontend page."""
    if "uploaded_docs" not in session:
        session["uploaded_docs"] = []
    if "verified_files" not in session:
        session["verified_files"] = []
    return render_template("index.html")


@app.route("/personal-details", methods=["POST"])
def save_personal_details():
    """
    Save personal details (name, gender, DOB) to the session.
    These are used to cross-check against OCR results.
    """
    data = request.get_json()

    name = data.get("name", "").strip()
    gender = data.get("gender", "").strip()
    dob = data.get("dob", "").strip()

    if not name:
        return jsonify({
            "success": False,
            "error": "Name is required.",
        }), 400

    if not gender:
        return jsonify({
            "success": False,
            "error": "Gender is required.",
        }), 400

    if not dob:
        return jsonify({
            "success": False,
            "error": "Date of Birth is required.",
        }), 400

    session["personal_details"] = {
        "name": name,
        "gender": gender,
        "dob": dob,
    }
    session.modified = True

    return jsonify({
        "success": True,
        "message": "Personal details saved successfully.",
    })


@app.route("/upload", methods=["POST"])
def upload():
    """
    Handle document upload, OCR processing, name cross-check,
    and keyword verification.
    """
    # --- Check personal details are saved ---
    personal = session.get("personal_details")
    if not personal:
        return jsonify({
            "success": False,
            "error": "Please save your personal details before uploading documents.",
        }), 400

    # --- Step 1: Validate file presence ---
    if "document" not in request.files:
        return jsonify({
            "success": False,
            "error": "No file was uploaded. Please select a document image.",
        }), 400

    file = request.files["document"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "No file selected. Please choose a document to upload.",
        }), 400

    # --- Step 2: Validate file extension ---
    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "error": f"File type not allowed. Please upload one of: "
                     f"{', '.join(ALLOWED_EXTENSIONS)}",
        }), 400

    # --- Step 3: Validate file size ---
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_FILE_SIZE:
        return jsonify({
            "success": False,
            "error": "File is too large. Maximum allowed size is 5 MB.",
        }), 400

    if file_size == 0:
        return jsonify({
            "success": False,
            "error": "The uploaded file is empty. Please select a valid document.",
        }), 400

    # --- Step 4: Call OCR.space API ---
    ocr_result = call_ocr_api(file)

    if not ocr_result["success"]:
        return jsonify({
            "success": False,
            "error": ocr_result["error"],
        }), 422

    # --- Step 5: Cross-check name against OCR text ---
    extracted_text = ocr_result["text"]
    user_name = personal["name"]

    name_found = check_name_in_text(user_name, extracted_text)

    if not name_found:
        return jsonify({
            "success": False,
            "error": f"Name \"{user_name}\" was not found in the uploaded document. "
                     "This document does not appear to belong to you. "
                     "Please upload a document that contains your name.",
            "name_rejected": True,
            "text": extracted_text,
        }), 422

    # --- Step 6: Check for document keywords ---
    verification = check_keywords(extracted_text)

    # --- Step 7: Update session with verified documents ---
    file_info = None
    if verification["verified"]:
        if "uploaded_docs" not in session:
            session["uploaded_docs"] = []

        for doc in verification["found"]:
            if doc not in session["uploaded_docs"]:
                session["uploaded_docs"].append(doc)

        # Save the verified file for later download
        file_info = save_verified_file(file, verification["doc_type"])

        if "verified_files" not in session:
            session["verified_files"] = []

        session["verified_files"].append(file_info)
        session.modified = True

    # --- Step 8: Return complete results ---
    return jsonify({
        "success": True,
        "text": extracted_text,
        "verification": verification,
        "uploaded_docs": session.get("uploaded_docs", []),
        "missing_docs": get_missing_docs(),
        "verified_files": session.get("verified_files", []),
        "file_info": file_info,
    })


@app.route("/download/<file_id>", methods=["GET"])
def download_file(file_id):
    """
    Download a verified file by its ID.
    """
    verified_files = session.get("verified_files", [])

    # Find the file info by ID
    file_info = None
    for f in verified_files:
        if f["file_id"] == file_id:
            file_info = f
            break

    if not file_info:
        return jsonify({
            "success": False,
            "error": "File not found or session expired.",
        }), 404

    filepath = os.path.join(UPLOAD_DIR, file_info["saved_name"])

    if not os.path.exists(filepath):
        return jsonify({
            "success": False,
            "error": "File no longer exists on the server.",
        }), 404

    return send_file(
        filepath,
        as_attachment=True,
        download_name=file_info["original_name"],
    )


@app.route("/verified-files", methods=["GET"])
def get_verified_files():
    """
    Return the list of verified files for the current session.
    """
    return jsonify({
        "verified_files": session.get("verified_files", []),
    })


@app.route("/status", methods=["GET"])
def status():
    """Return the current document verification status."""
    uploaded = session.get("uploaded_docs", [])
    missing = get_missing_docs()
    return jsonify({
        "uploaded_docs": uploaded,
        "missing_docs": missing,
        "required_docs": REQUIRED_DOCS,
        "is_complete": len(missing) == 0,
    })


@app.route("/submit", methods=["POST"])
def submit_application():
    """Handle the final application submission."""
    missing = get_missing_docs()

    if missing:
        return jsonify({
            "success": False,
            "message": "Cannot submit application. The following documents "
                       "are still missing:",
            "missing_docs": missing,
        }), 400

    return jsonify({
        "success": True,
        "message": "All required documents are verified! "
                   "Your application has been submitted successfully.",
        "missing_docs": [],
    })


@app.route("/delete-file/<file_id>", methods=["DELETE"])
def delete_file(file_id):
    """Delete a single verified file by its ID, so it can be re-uploaded."""
    verified_files = session.get("verified_files", [])

    # Find the file
    file_info = None
    for f in verified_files:
        if f["file_id"] == file_id:
            file_info = f
            break

    if not file_info:
        return jsonify({"success": False, "error": "File not found."}), 404

    # Remove the physical file
    filepath = os.path.join(UPLOAD_DIR, file_info["saved_name"])
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except OSError:
            pass

    # Remove from verified_files list
    session["verified_files"] = [
        f for f in verified_files if f["file_id"] != file_id
    ]

    # Remove the doc_type from uploaded_docs so checklist updates
    doc_type = file_info.get("doc_type", "")
    uploaded_docs = session.get("uploaded_docs", [])
    # Only remove if no other verified file of the same type remains
    remaining_types = [f["doc_type"] for f in session["verified_files"]]
    if doc_type not in remaining_types and doc_type in uploaded_docs:
        uploaded_docs.remove(doc_type)
        session["uploaded_docs"] = uploaded_docs

    session.modified = True

    return jsonify({
        "success": True,
        "message": f"{doc_type} file removed. You can re-upload a new one.",
        "verified_files": session.get("verified_files", []),
        "uploaded_docs": session.get("uploaded_docs", []),
        "missing_docs": get_missing_docs(),
    })


# ===========================
#  Run the Application
# ===========================
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)