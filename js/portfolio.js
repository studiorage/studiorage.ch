(function initMaskedReveals() {
    const revealItems = document.querySelectorAll(".reveal, .text-mask-reveal, .media-reveal-x, .media-reveal-y");
    if (!revealItems.length) return;
    if (!("IntersectionObserver" in window)) { revealItems.forEach(item => item.classList.add("is-visible")); return; }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, { rootMargin: "0px 0px -7%", threshold: .08 });
    revealItems.forEach(item => observer.observe(item));
})();

