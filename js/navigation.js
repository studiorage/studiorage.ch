(function initNavigation() {
    const toggle = document.querySelector(".menu-toggle");
    const panel = document.getElementById("mobile-menu");
    if (!toggle || !panel) return;
    const closeButton = panel.querySelector(".menu-panel__close");
    const links = panel.querySelectorAll("a");
    let returnFocus = null;

    function openMenu() {
        returnFocus = document.activeElement;
        panel.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");
        toggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("is-locked");
        closeButton.focus();
    }
    function closeMenu() {
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("is-locked");
        if (returnFocus) returnFocus.focus();
    }
    toggle.addEventListener("click", openMenu);
    closeButton.addEventListener("click", closeMenu);
    links.forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && panel.classList.contains("is-open")) closeMenu();
        if (event.key !== "Tab" || !panel.classList.contains("is-open")) return;
        const focusable = [closeButton, ...links];
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
})();

