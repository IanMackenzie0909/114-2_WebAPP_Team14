/**
 * contact.js
 * Handles feedback form validation, AJAX submission, and toast notifications.
 */

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("feedback-form");
    const submitBtn = document.getElementById("submit-feedback-btn");
    if (!form || !submitBtn) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearErrors();

        // Collect field values
        const name     = form.querySelector("#feedback-name").value.trim();
        const email    = form.querySelector("#feedback-email").value.trim();
        const category = form.querySelector("#feedback-category").value;
        const message  = form.querySelector("#feedback-message").value.trim();

        // ── Client-side validation ──────────────────────────────────
        let valid = true;

        if (!name) {
            showFieldError("name", "Please enter your name.");
            valid = false;
        }
        if (!email) {
            showFieldError("email", "Please enter your email.");
            valid = false;
        } else if (!isValidEmail(email)) {
            showFieldError("email", "Please enter a valid email address.");
            valid = false;
        }
        if (!category) {
            showFieldError("category", "Please select a category.");
            valid = false;
        }
        if (!message) {
            showFieldError("message", "Please enter your feedback.");
            valid = false;
        }

        if (!valid) return;

        // ── Submit via AJAX ─────────────────────────────────────────
        setLoading(true);

        try {
            const res = await fetch("/api/feedback/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(),
                },
                body: JSON.stringify({ name, email, category, message }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                showToast("Thank you! Your feedback has been submitted. 🎉", "success");
                form.reset();
            } else if (data.errors) {
                // Server-side validation errors — display per field
                Object.entries(data.errors).forEach(([field, msg]) => {
                    showFieldError(field, msg);
                });
            } else {
                showToast(data.error || "Something went wrong. Please try again.", "error");
            }
        } catch (err) {
            console.error("Feedback submission error:", err);
            showToast("Network error. Please check your connection.", "error");
        } finally {
            setLoading(false);
        }
    });

    // ── Helper functions ────────────────────────────────────────────

    /** Basic email format check */
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /** Read the CSRF token from cookies (set by Django's ensure_csrf_cookie) */
    function getCSRFToken() {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? match[1] : "";
    }

    /** Show an inline error message beneath a form field */
    function showFieldError(field, msg) {
        const el = document.getElementById(`error-${field}`);
        if (el) el.textContent = msg;
    }

    /** Clear all inline error messages */
    function clearErrors() {
        document.querySelectorAll(".field-error").forEach((el) => {
            el.textContent = "";
        });
    }

    /** Toggle loading state on the submit button */
    function setLoading(loading) {
        const btnText   = submitBtn.querySelector(".btn-text");
        const btnLoader = submitBtn.querySelector(".btn-loader");

        if (loading) {
            submitBtn.classList.add("is-loading");
            if (btnText)   btnText.hidden = true;
            if (btnLoader) btnLoader.hidden = false;
        } else {
            submitBtn.classList.remove("is-loading");
            if (btnText)   btnText.hidden = false;
            if (btnLoader) btnLoader.hidden = true;
        }
    }

    /** Display a toast notification (auto-hides after 3.5 s) */
    function showToast(msg, type = "success") {
        // Remove any existing toast
        const existing = document.querySelector(".toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        document.body.appendChild(toast);

        // Trigger entrance animation on next frame
        requestAnimationFrame(() => {
            toast.classList.add("is-visible");
        });

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove("is-visible");
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }
});
