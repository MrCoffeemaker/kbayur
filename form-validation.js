document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contact-form");
  const formContainer = document.getElementById("form-container");
  const thankYou = document.getElementById("thank-you");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Temizle
    form.querySelectorAll('.error-message').forEach(el => el.remove());
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    let isValid = true;

    form.querySelectorAll("[required]").forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        field.classList.add("input-error");

        const error = document.createElement("div");
        error.classList.add("error-message");
        error.textContent = "This field is required.";

        field.parentNode.insertBefore(error, field.nextSibling);
      }
    });

    if (!isValid) return;

    const formData = new FormData(form);

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
      } else {
        alert("Oops! There was a problem submitting your form.");
      }
    } catch (error) {
      alert("There was an error. Please try again later.");
    }
  });
});
