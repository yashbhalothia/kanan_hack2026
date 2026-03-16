/**
 * ==========================================================
 *  Student Verification Hub — Frontend Logic
 * ----------------------------------------------------------
 *  Handles personal details, drag-and-drop file uploads,
 *  AJAX communication with Flask backend, progress tracker,
 *  results rendering, verified files download, re-upload,
 *  navbar tabs, checklist, and toast notifications.
 * ==========================================================
 */

// ===========================
//  DOM Element References
// ===========================

// Personal details (Home form)
const inputName = document.getElementById("inputName");
const inputGender = document.getElementById("inputGender");
const inputDOB = document.getElementById("inputDOB");
const saveDetailsBtn = document.getElementById("saveDetailsBtn");
const detailsSavedBadge = document.getElementById("detailsSavedBadge");
const personalDetailsSection = document.getElementById("personalDetailsSection");

// Upload elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const filePreview = document.getElementById("filePreview");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFileBtn = document.getElementById("removeFileBtn");
const uploadBtn = document.getElementById("uploadBtn");

// Progress tracker steps
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");

// Results & status
const resultsSection = document.getElementById("resultsSection");
const resultsContent = document.getElementById("resultsContent");
const docStatusCards = document.getElementById("docStatusCards");

// Verified files (Home view)
const verifiedFilesList = document.getElementById("verifiedFilesList");

// Loading overlay
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");

// Submit button
const submitBtn = document.getElementById("submitBtn");

// Toast notification elements
const notificationToast = document.getElementById("notificationToast");
const toastBody = document.getElementById("toastBody");
const toastIcon = document.getElementById("toastIcon");
const toastMessage = document.getElementById("toastMessage");

// Tab elements
const tabButtons = document.querySelectorAll(".nav-tab-link");
const tabPanels = document.querySelectorAll(".tab-panel");
const detailsTabContent = document.getElementById("detailsTabContent");
const filesTabContent = document.getElementById("filesTabContent");
const checklistContent = document.getElementById("checklistContent");
const editDetailsBtnTab = document.getElementById("editDetailsBtnTab");
const navBrandLink = document.getElementById("navBrandLink");

// The currently selected file
let selectedFile = null;

// Whether personal details have been saved
let detailsSaved = false;

// Cached details for tabs
let savedDetails = null;


// ===========================
//  Initialization
// ===========================

document.addEventListener("DOMContentLoaded", function () {
    fetchDocumentStatus();
    fetchVerifiedFiles();
    setupDragAndDrop();
    setupEventListeners();
    setupTabNavigation();
});


// ===========================
//  Tab Navigation
// ===========================

function setupTabNavigation() {
    tabButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // Clicking the brand/logo returns to Home
    navBrandLink.addEventListener("click", function (e) {
        e.preventDefault();
        switchTab("home");
    });

    // Edit button on Details tab → switch to home and unlock form
    editDetailsBtnTab.addEventListener("click", function () {
        switchTab("home");
        unlockPersonalDetails();
    });
}

function switchTab(tabName) {
    // Update button states
    tabButtons.forEach(function (btn) {
        if (btn.dataset.tab === tabName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Show/hide panels
    tabPanels.forEach(function (panel) {
        panel.classList.remove("active");
    });

    var targetPanel = document.getElementById("panel" + capitalize(tabName));
    if (targetPanel) {
        targetPanel.classList.add("active");
    }

    // Refresh tab content when switching
    if (tabName === "details") {
        renderDetailsTab();
    } else if (tabName === "files") {
        renderFilesTab();
    } else if (tabName === "checklist") {
        fetchDocumentStatus(); // refreshes checklist
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


// ===========================
//  Personal Details
// ===========================

/**
 * Save personal details to the backend session.
 */
async function savePersonalDetails() {
    var name = inputName.value.trim();
    var gender = inputGender.value;
    var dob = inputDOB.value;

    if (!name) {
        showToast("Please enter your full name.", "warning");
        inputName.focus();
        return;
    }
    if (!gender) {
        showToast("Please select your gender.", "warning");
        inputGender.focus();
        return;
    }
    if (!dob) {
        showToast("Please enter your date of birth.", "warning");
        inputDOB.focus();
        return;
    }

    try {
        var response = await fetch("/personal-details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, gender: gender, dob: dob }),
        });

        var data = await response.json();

        if (data.success) {
            detailsSaved = true;
            savedDetails = { name: name, gender: gender, dob: dob };
            hidePersonalDetailsFromHome();
            showToast("Personal details saved! You can view them in the Details tab.", "success");
        } else {
            showToast(data.error || "Failed to save details.", "error");
        }
    } catch (error) {
        console.error("Save details error:", error);
        showToast("Network error. Please try again.", "error");
    }
}

/**
 * Hide the personal details form from home page after saving.
 */
function hidePersonalDetailsFromHome() {
    personalDetailsSection.style.transition = "all 0.4s ease";
    personalDetailsSection.style.opacity = "0";
    personalDetailsSection.style.transform = "translateY(-10px)";
    setTimeout(function () {
        personalDetailsSection.classList.add("d-none");
    }, 400);
}

/**
 * Show the personal details form on home page again for editing.
 */
function unlockPersonalDetails() {
    personalDetailsSection.classList.remove("d-none");
    personalDetailsSection.style.opacity = "1";
    personalDetailsSection.style.transform = "translateY(0)";

    inputName.disabled = false;
    inputGender.disabled = false;
    inputDOB.disabled = false;

    // Restore values if we have them
    if (savedDetails) {
        inputName.value = savedDetails.name;
        inputGender.value = savedDetails.gender;
        inputDOB.value = savedDetails.dob;
    }

    saveDetailsBtn.classList.remove("d-none");
    detailsSavedBadge.classList.add("d-none");
    detailsSaved = false;
}


// ===========================
//  Details Tab Rendering
// ===========================

function renderDetailsTab() {
    if (!savedDetails) {
        detailsTabContent.innerHTML =
            '<div class="no-verified-files">' +
            '  <i class="bi bi-person-x"></i>' +
            '  <p>No personal details saved yet. Go to the Home tab and fill in your details first.</p>' +
            '</div>';
        editDetailsBtnTab.classList.add("d-none");
        return;
    }

    editDetailsBtnTab.classList.remove("d-none");

    var html = '';
    html += '<div class="details-display-grid">';

    html += '<div class="detail-card">';
    html += '  <div class="detail-card-icon"><i class="bi bi-person-fill"></i></div>';
    html += '  <div class="detail-card-content">';
    html += '    <span class="detail-label">Full Name</span>';
    html += '    <span class="detail-value">' + escapeHtml(savedDetails.name) + '</span>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="detail-card">';
    html += '  <div class="detail-card-icon"><i class="bi bi-gender-ambiguous"></i></div>';
    html += '  <div class="detail-card-content">';
    html += '    <span class="detail-label">Gender</span>';
    html += '    <span class="detail-value">' + escapeHtml(savedDetails.gender) + '</span>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="detail-card">';
    html += '  <div class="detail-card-icon"><i class="bi bi-calendar-event-fill"></i></div>';
    html += '  <div class="detail-card-content">';
    html += '    <span class="detail-label">Date of Birth</span>';
    html += '    <span class="detail-value">' + escapeHtml(savedDetails.dob) + '</span>';
    html += '  </div>';
    html += '</div>';

    html += '</div>';

    detailsTabContent.innerHTML = html;
}


// ===========================
//  Files Tab Rendering
// ===========================

async function renderFilesTab() {
    try {
        var response = await fetch("/verified-files");
        var data = await response.json();
        var files = data.verified_files || [];

        if (files.length === 0) {
            filesTabContent.innerHTML =
                '<div class="no-verified-files">' +
                '  <i class="bi bi-inbox"></i>' +
                '  <p>No verified files yet. Upload and verify documents from the Home tab.</p>' +
                '</div>';
            return;
        }

        var html = '<div class="files-tab-grid">';

        files.forEach(function (file) {
            html += '<div class="file-tab-card">';
            html += '  <div class="file-tab-card-header">';
            html += '    <div class="file-tab-icon"><i class="bi bi-file-earmark-check-fill"></i></div>';
            html += '    <span class="file-tab-type">' + escapeHtml(file.doc_type) + '</span>';
            html += '  </div>';
            html += '  <p class="file-tab-name">' + escapeHtml(file.original_name) + '</p>';
            html += '  <a href="/download/' + file.file_id + '" class="btn-download w-100 text-center">';
            html += '    <i class="bi bi-download me-1"></i> Download';
            html += '  </a>';
            html += '</div>';
        });

        html += '</div>';
        filesTabContent.innerHTML = html;
    } catch (error) {
        console.error("Failed to render files tab:", error);
    }
}


// ===========================
//  Checklist Tab Rendering
// ===========================

function renderChecklist(data) {
    if (!checklistContent) return;

    var html = '';
    var totalDocs = data.required_docs.length;
    var doneDocs = data.uploaded_docs.length;
    var percent = totalDocs > 0 ? Math.round((doneDocs / totalDocs) * 100) : 0;

    // Progress bar
    html += '<div class="checklist-progress-bar mb-4">';
    html += '  <div class="d-flex justify-content-between align-items-center mb-2">';
    html += '    <span class="checklist-progress-label">' + doneDocs + ' of ' + totalDocs + ' documents verified</span>';
    html += '    <span class="checklist-progress-percent">' + percent + '%</span>';
    html += '  </div>';
    html += '  <div class="checklist-bar-track">';
    html += '    <div class="checklist-bar-fill" style="width:' + percent + '%"></div>';
    html += '  </div>';
    html += '</div>';

    // Checklist items
    data.required_docs.forEach(function (doc) {
        var isVerified = data.uploaded_docs.indexOf(doc) !== -1;
        var stateClass = isVerified ? "verified" : "pending";
        var icon = isVerified ? "bi-check-circle-fill" : "bi-circle";
        var statusText = isVerified ? "Verified" : "Pending";

        html += '<div class="checklist-item ' + stateClass + '">';
        html += '  <div class="checklist-item-icon"><i class="bi ' + icon + '"></i></div>';
        html += '  <div class="checklist-item-info">';
        html += '    <span class="checklist-item-name">' + escapeHtml(doc) + '</span>';
        html += '    <span class="checklist-item-status">' + statusText + '</span>';
        html += '  </div>';
        if (isVerified) {
            html += '  <div class="checklist-item-badge"><i class="bi bi-patch-check-fill"></i></div>';
        } else {
            html += '  <div class="checklist-item-badge pending"><i class="bi bi-clock"></i></div>';
        }
        html += '</div>';
    });

    checklistContent.innerHTML = html;
}


// ===========================
//  Drag & Drop Handlers
// ===========================

function setupDragAndDrop() {
    ["dragenter", "dragover", "dragleave", "drop"].forEach(function (eventName) {
        dropZone.addEventListener(eventName, function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
        dropZone.addEventListener(eventName, function () {
            dropZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
        dropZone.addEventListener(eventName, function () {
            dropZone.classList.remove("drag-over");
        });
    });

    dropZone.addEventListener("drop", function (e) {
        var files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    dropZone.addEventListener("click", function () {
        fileInput.click();
    });

    fileInput.addEventListener("change", function () {
        if (fileInput.files.length > 0) {
            handleFileSelection(fileInput.files[0]);
        }
    });
}


// ===========================
//  Event Listeners
// ===========================

function setupEventListeners() {
    uploadBtn.addEventListener("click", uploadDocument);
    removeFileBtn.addEventListener("click", clearFileSelection);
    submitBtn.addEventListener("click", submitApplication);
    saveDetailsBtn.addEventListener("click", savePersonalDetails);
}


// ===========================
//  File Selection
// ===========================

function handleFileSelection(file) {
    var allowedTypes = ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "pdf"];
    var extension = file.name.split(".").pop().toLowerCase();

    if (allowedTypes.indexOf(extension) === -1) {
        showToast("Invalid file type. Please upload: " + allowedTypes.join(", "), "error");
        return;
    }

    var maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast("File is too large. Maximum size is 5 MB.", "error");
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    filePreview.classList.remove("d-none");
    uploadBtn.disabled = false;

    showToast("File selected: " + file.name, "success");
}

function clearFileSelection() {
    selectedFile = null;
    fileInput.value = "";
    filePreview.classList.add("d-none");
    uploadBtn.disabled = true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    var sizes = ["Bytes", "KB", "MB", "GB"];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
}


// ===========================
//  Document Upload & OCR
// ===========================

async function uploadDocument() {
    if (!selectedFile) {
        showToast("Please select a file first.", "warning");
        return;
    }

    // Check if personal details are saved
    if (!detailsSaved) {
        showToast("Please save your personal details before uploading.", "warning");
        return;
    }

    uploadBtn.disabled = true;
    showLoading("Uploading your document...");
    resetProgress();

    try {
        // --- STEP 1: Upload ---
        setStepState(step1, "active");
        updateLoadingText("Uploading your document...");

        var formData = new FormData();
        formData.append("document", selectedFile);

        setStepState(step1, "completed");
        setStepState(step2, "active");
        updateLoadingText("Extracting text with AI-powered OCR...");

        // --- STEP 2 & 3: Send to backend ---
        var response = await fetch("/upload", {
            method: "POST",
            body: formData,
        });

        var data = await response.json();

        setStepState(step2, "completed");

        // --- STEP 3: Show results ---
        if (data.success) {
            setStepState(step3, "completed");
            showToast("Document processed successfully!", "success");
        } else {
            setStepState(step3, "error");
            if (data.name_rejected) {
                showToast("Name not found — document rejected.", "error");
            } else {
                showToast(data.error || "Verification failed.", "error");
            }
        }

        renderResults(data);
        fetchDocumentStatus();
        fetchVerifiedFiles();
        clearFileSelection();

    } catch (error) {
        console.error("Upload error:", error);
        setStepState(step1, "error");
        showToast("A network error occurred. Please check your connection and try again.", "error");
    } finally {
        hideLoading();
        uploadBtn.disabled = false;
    }
}


// ===========================
//  Re-upload (Delete Single File)
// ===========================

async function reuploadFile(fileId) {
    try {
        var response = await fetch("/delete-file/" + fileId, {
            method: "DELETE",
        });

        var data = await response.json();

        if (data.success) {
            showToast(data.message || "File removed. You can re-upload.", "success");
            fetchDocumentStatus();
            fetchVerifiedFiles();
        } else {
            showToast(data.error || "Failed to remove file.", "error");
        }
    } catch (error) {
        console.error("Re-upload error:", error);
        showToast("Network error. Please try again.", "error");
    }
}


// ===========================
//  Progress Tracker
// ===========================

function setStepState(stepEl, state) {
    stepEl.classList.remove("active", "completed", "error");

    if (state !== "default") {
        stepEl.classList.add(state);
    }

    var icon = stepEl.querySelector(".step-circle i");
    if (state === "completed") {
        icon.className = "bi bi-check-lg";
    } else if (state === "error") {
        icon.className = "bi bi-x-lg";
    } else {
        var stepNum = stepEl.dataset.step;
        if (stepNum === "1") icon.className = "bi bi-cloud-arrow-up";
        if (stepNum === "2") icon.className = "bi bi-cpu";
        if (stepNum === "3") icon.className = "bi bi-patch-check";
    }
}

function resetProgress() {
    setStepState(step1, "default");
    setStepState(step2, "default");
    setStepState(step3, "default");
}


// ===========================
//  Results Rendering
// ===========================

function renderResults(data) {
    resultsSection.classList.remove("d-none");

    var html = "";

    if (data.success) {
        var isVerified = data.verification.verified;
        var cardClass = isVerified ? "verified" : "not-verified";
        var badgeClass = isVerified ? "verified" : "not-verified";
        var badgeText = isVerified ? "Verified" : "Not Verified";
        var badgeIcon = isVerified ? "bi-check-circle-fill" : "bi-x-circle-fill";

        html += '<div class="result-card ' + cardClass + '">';
        html += '  <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">';
        html += '    <div>';
        html += '      <h5 class="mb-1">Document Analysis</h5>';
        html += '      <p class="text-muted mb-0" style="font-size:0.85rem;">Document type: <strong>' + escapeHtml(data.verification.doc_type) + '</strong></p>';
        html += '    </div>';
        html += '    <span class="result-badge ' + badgeClass + '">';
        html += '      <i class="bi ' + badgeIcon + '"></i> ' + badgeText;
        html += '    </span>';
        html += '  </div>';

        if (data.verification.found && data.verification.found.length > 0) {
            html += '  <div class="mb-3">';
            html += '    <small class="text-muted d-block mb-2">Matched Document Types:</small>';
            data.verification.found.forEach(function (keyword) {
                html += '    <span class="keyword-tag"><i class="bi bi-tag-fill"></i> ' + escapeHtml(keyword) + '</span>';
            });
            html += '  </div>';
        }

        if (data.text) {
            html += '  <div>';
            html += '    <small class="text-muted d-block mb-1">Extracted Text:</small>';
            html += '    <div class="extracted-text">' + escapeHtml(data.text) + '</div>';
            html += '  </div>';
        }

        html += '</div>';

        if (data.missing_docs && data.missing_docs.length > 0) {
            html += '<div class="result-card not-verified">';
            html += '  <h5 class="mb-2"><i class="bi bi-exclamation-triangle-fill me-2" style="color:var(--accent-orange)"></i>Still Missing</h5>';
            html += '  <div class="d-flex flex-wrap gap-2">';
            data.missing_docs.forEach(function (doc) {
                html += '    <span class="result-badge not-verified"><i class="bi bi-file-earmark-x"></i> ' + escapeHtml(doc) + '</span>';
            });
            html += '  </div>';
            html += '</div>';
        }
    } else {
        // Error result card — handle name rejection specially
        html += '<div class="result-card not-verified">';
        html += '  <div class="d-flex align-items-center gap-2 mb-2">';
        if (data.name_rejected) {
            html += '    <span class="result-badge not-verified"><i class="bi bi-person-x-fill"></i> Name Not Found</span>';
        } else {
            html += '    <span class="result-badge not-verified"><i class="bi bi-x-circle-fill"></i> Error</span>';
        }
        html += '  </div>';
        html += '  <p class="mb-0">' + escapeHtml(data.error || "An unknown error occurred.") + '</p>';

        // Show extracted text even on rejection so user can see what was found
        if (data.text) {
            html += '  <div class="mt-3">';
            html += '    <small class="text-muted d-block mb-1">Extracted Text:</small>';
            html += '    <div class="extracted-text">' + escapeHtml(data.text) + '</div>';
            html += '  </div>';
        }

        html += '</div>';
    }

    resultsContent.innerHTML = html;
}


// ===========================
//  Document Status Dashboard
// ===========================

async function fetchDocumentStatus() {
    try {
        var response = await fetch("/status");
        var data = await response.json();
        renderStatusCards(data);
        renderChecklist(data);
    } catch (error) {
        console.error("Failed to fetch document status:", error);
    }
}

function renderStatusCards(data) {
    var html = "";

    var docIcons = {
        "Passport": "bi-journal-bookmark-fill",
        "High School Marksheet": "bi-file-earmark-text-fill",
        "Visa": "bi-globe2",
    };

    data.required_docs.forEach(function (doc) {
        var isUploaded = data.uploaded_docs.indexOf(doc) !== -1;
        var stateClass = isUploaded ? "verified" : "pending";
        var icon = docIcons[doc] || "bi-file-earmark";
        var statusIcon = isUploaded ? "bi-check-circle-fill" : "bi-clock";
        var statusLabel = isUploaded ? "Verified" : "Pending";

        html += '<div class="col-sm-6 col-md-4">';
        html += '  <div class="doc-status-card ' + stateClass + '">';
        html += '    <div class="doc-status-icon"><i class="bi ' + icon + '"></i></div>';
        html += '    <p class="doc-status-name">' + escapeHtml(doc) + '</p>';
        html += '    <p class="doc-status-label"><i class="bi ' + statusIcon + ' me-1"></i>' + statusLabel + '</p>';
        html += '  </div>';
        html += '</div>';
    });

    docStatusCards.innerHTML = html;
}


// ===========================
//  Verified Files
// ===========================

async function fetchVerifiedFiles() {
    try {
        var response = await fetch("/verified-files");
        var data = await response.json();
        renderVerifiedFiles(data.verified_files);
    } catch (error) {
        console.error("Failed to fetch verified files:", error);
    }
}

function renderVerifiedFiles(files) {
    if (!files || files.length === 0) {
        verifiedFilesList.innerHTML =
            '<div class="no-verified-files">' +
            '  <i class="bi bi-inbox"></i>' +
            '  <p>No verified files yet. Upload and verify documents to see them here.</p>' +
            '</div>';
        return;
    }

    var html = "";
    files.forEach(function (file) {
        html += '<div class="verified-file-item">';
        // Re-upload button at the top
        html += '  <div class="verified-file-actions">';
        html += '    <button class="btn-reupload" onclick="reuploadFile(\'' + file.file_id + '\')" title="Remove and re-upload this file">';
        html += '      <i class="bi bi-arrow-repeat me-1"></i>Re-upload';
        html += '    </button>';
        html += '  </div>';
        html += '  <div class="verified-file-body">';
        html += '    <div class="verified-file-icon">';
        html += '      <i class="bi bi-check-circle-fill"></i>';
        html += '    </div>';
        html += '    <div class="verified-file-info">';
        html += '      <p class="verified-file-name mb-0">' + escapeHtml(file.original_name) + '</p>';
        html += '      <p class="verified-file-type mb-0"><i class="bi bi-patch-check-fill me-1"></i>' + escapeHtml(file.doc_type) + '</p>';
        html += '    </div>';
        html += '    <a href="/download/' + file.file_id + '" class="btn-download">';
        html += '      <i class="bi bi-download"></i> Download';
        html += '    </a>';
        html += '  </div>';
        html += '</div>';
    });

    verifiedFilesList.innerHTML = html;
}


// ===========================
//  Final Submission
// ===========================

async function submitApplication() {
    try {
        var response = await fetch("/submit", { method: "POST" });
        var data = await response.json();

        if (data.success) {
            var successModal = new bootstrap.Modal(document.getElementById("successModal"));
            successModal.show();
            showToast("Application submitted successfully!", "success");
        } else {
            var missingBody = document.getElementById("missingDocsBody");
            var html = '<p class="mb-3">' + escapeHtml(data.message) + '</p>';

            if (data.missing_docs) {
                data.missing_docs.forEach(function (doc) {
                    html += '<div class="missing-doc-item">';
                    html += '  <i class="bi bi-file-earmark-x-fill"></i>';
                    html += '  <span>' + escapeHtml(doc) + '</span>';
                    html += '</div>';
                });
            }

            missingBody.innerHTML = html;
            var missingModal = new bootstrap.Modal(document.getElementById("missingDocsModal"));
            missingModal.show();
        }
    } catch (error) {
        console.error("Submit error:", error);
        showToast("Failed to submit application. Please try again.", "error");
    }
}


// ===========================
//  Loading Overlay
// ===========================

function showLoading(message) {
    loadingText.textContent = message || "Processing...";
    loadingOverlay.classList.remove("d-none");
}

function hideLoading() {
    loadingOverlay.classList.add("d-none");
}

function updateLoadingText(message) {
    loadingText.textContent = message;
}


// ===========================
//  Toast Notifications
// ===========================

function showToast(message, type) {
    notificationToast.classList.remove("toast-success", "toast-error", "toast-warning");
    notificationToast.classList.add("toast-" + type);

    var iconMap = {
        success: "bi-check-circle-fill text-success",
        error: "bi-x-circle-fill text-danger",
        warning: "bi-exclamation-triangle-fill text-warning",
    };
    toastIcon.className = "bi " + (iconMap[type] || iconMap.success);
    toastMessage.textContent = message;

    var toast = new bootstrap.Toast(notificationToast, { delay: 4000 });
    toast.show();
}


// ===========================
//  Utility Functions
// ===========================

function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}
