(function initFaqCategories() {
    const section = document.querySelector(".faq-section");
    if (!section) return;

    const tabs = [...section.querySelectorAll("[data-faq-tab]")];
    const panels = [...section.querySelectorAll("[data-faq-panel]")];
    if (!tabs.length || !panels.length) return;

    document.documentElement.classList.add("faq-enhanced");

    function activate(name, focusTab = false, scrollTab = false) {
        const activeTab = tabs.find(tab => tab.dataset.faqTab === name) || tabs[0];
        const activeName = activeTab.dataset.faqTab;

        tabs.forEach(tab => {
            const selected = tab.dataset.faqTab === activeName;
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
            if (selected && focusTab) tab.focus({ preventScroll: true });
        });

        panels.forEach(panel => {
            const selected = panel.dataset.faqPanel === activeName;
            panel.hidden = !selected;
            if (!selected) panel.querySelectorAll("details[open]").forEach(item => item.removeAttribute("open"));
        });

        if (scrollTab) activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activate(tab.dataset.faqTab, false, true));
        tab.addEventListener("keydown", event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            let nextIndex = index;
            if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
            if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = tabs.length - 1;
            activate(tabs[nextIndex].dataset.faqTab, true, true);
        });
    });

    activate(tabs.find(tab => tab.getAttribute("aria-selected") === "true")?.dataset.faqTab || tabs[0].dataset.faqTab);
})();
