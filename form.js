document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contact-form");
  const formContainer = document.getElementById("form-container");
  const thankYou = document.getElementById("thank-you");

  if (!form || !formContainer || !thankYou) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const defaultButtonText = submitButton ? submitButton.textContent : "Send Message";

  function showError(field, message) {
    field.classList.add("input-error");
    field.setAttribute("aria-invalid", "true");

    const error = document.createElement("div");
    const errorId = `${field.id}-error`;
    error.id = errorId;
    error.classList.add("error-message");
    error.setAttribute("role", "alert");
    error.textContent = message;
    field.setAttribute("aria-describedby", errorId);
    field.insertAdjacentElement("afterend", error);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    form.querySelectorAll(".error-message").forEach(el => el.remove());
    form.querySelectorAll(".input-error").forEach(el => {
      el.classList.remove("input-error");
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
    });

    let isValid = true;
    let firstInvalidField = null;

    form.querySelectorAll("[required]").forEach(field => {
      const label = form.querySelector(`label[for="${field.id}"]`);
      const fieldName = label ? label.innerText.replace("*", "").trim() : "This field";

      if (!field.value.trim()) {
        isValid = false;
        firstInvalidField ||= field;
        showError(field, `${fieldName} is required.`);
      } else if (field.type === "email" && !field.validity.valid) {
        isValid = false;
        firstInvalidField ||= field;
        showError(field, "Please enter a valid email address.");
      }
    });

    if (!isValid) {
      firstInvalidField?.focus();
      return;
    }

    const formData = new FormData(form);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending…";
    }

    try {
      const response = await fetch(form.action, {
        method: form.method,
        headers: { Accept: "application/json" },
        body: formData
      });

      if (response.ok) {
        formContainer.style.display = "none";
        thankYou.style.display = "block";
        form.reset();
        thankYou.focus?.();
      } else {
        alert("Oops! There was a problem submitting your form.");
      }
    } catch (error) {
      alert("There was an error. Please try again later.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
});
