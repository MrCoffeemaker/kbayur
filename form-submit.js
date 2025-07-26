const form = document.getElementById("contact-form");
const formContainer = document.getElementById("form-container");
const thankYou = document.getElementById("thank-you");

form.addEventListener("submit", async function (e) {
  e.preventDefault();
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
