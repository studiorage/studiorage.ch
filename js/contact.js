(function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const status = document.getElementById("form-status");
    const submitButton = form.querySelector('[type="submit"]');
    const isFrench = document.documentElement.lang.toLowerCase().startsWith("fr");

    const messages = isFrench ? {
        invalid: "Complétez les champs obligatoires, indiquez un budget d'au moins CHF 500 et vérifiez l'adresse e-mail.",
        sending: "Envoi sécurisé en cours...",
        error: "L'envoi a échoué. Réessayez ou écrivez directement à hello@studiorage.ch.",
        success: "Votre demande a bien été envoyée. Je vous répondrai dès que possible."
    } : {
        invalid: "Complete the required fields, enter a budget of at least CHF 500 and check the email address.",
        sending: "Sending securely...",
        error: "The message could not be sent. Please try again or email hello@studiorage.ch directly.",
        success: "Your enquiry has been sent. I will reply as soon as possible."
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        form.querySelectorAll("[required]").forEach((field) => {
            field.setAttribute("aria-invalid", String(!field.checkValidity()));
        });

        if (!form.checkValidity()) {
            status.textContent = messages.invalid;
            form.reportValidity();
            return;
        }

        status.textContent = messages.sending;
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" },
                credentials: "same-origin"
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload.ok) {
                throw new Error(payload.message || messages.error);
            }

            status.textContent = payload.message || messages.success;
            form.reset();
            form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
        } catch (error) {
            status.textContent = error instanceof Error && error.message ? error.message : messages.error;
        } finally {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
        }
    });

    form.addEventListener("input", (event) => {
        if (event.target.matches("[required]")) {
            event.target.setAttribute("aria-invalid", String(!event.target.checkValidity()));
        }
    });
})();