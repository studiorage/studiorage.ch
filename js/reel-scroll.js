(function initScrollReel() {
    const section = document.querySelector(".hero-reel");
    const isFrench = document.documentElement.lang.toLowerCase().startsWith("fr");
    const video = section && section.querySelector(".hero-reel__video");
    const status = section && section.querySelector(".hero-reel__label span:last-child");
    if (!section || !video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameRequested = false;
    let loadFailed = false;
    let errorTimer = 0;

    const clamp = value => Math.min(1, Math.max(0, value));
    const easeOut = value => 1 - Math.pow(1 - value, 3);

    function markReady() {
        loadFailed = false;
        window.clearTimeout(errorTimer);
        section.classList.add("is-ready");
        section.classList.remove("is-error");
    }

    function markError() {
        loadFailed = true;
        window.clearTimeout(errorTimer);
        errorTimer = window.setTimeout(() => {
            if (loadFailed && video.readyState === 0) section.classList.add("is-error");
        }, 1800);
    }

    function update() {
        frameRequested = false;
        if (reducedMotion.matches) {
            section.style.setProperty("--reel-inset-x", "0px");
            section.style.setProperty("--reel-inset-y", "0px");
            section.style.setProperty("--reel-radius", "0px");
            section.style.setProperty("--reel-scale", "1");
            section.style.setProperty("--reel-opacity", "1");
            return;
        }

        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const scrollable = Math.max(1, rect.height - viewportHeight);
        const progress = clamp(-rect.top / scrollable);
        const reveal = easeOut(clamp(progress / .56));
        const insetX = (1 - reveal) * Math.min(window.innerWidth * .08, 150);
        const insetY = (1 - reveal) * Math.min(viewportHeight * .12, 110);

        section.style.setProperty("--reel-inset-x", `${insetX.toFixed(2)}px`);
        section.style.setProperty("--reel-inset-y", `${insetY.toFixed(2)}px`);
        section.style.setProperty("--reel-radius", `${((1 - reveal) * 24).toFixed(2)}px`);
        section.style.setProperty("--reel-scale", `${(.96 + reveal * .04).toFixed(4)}`);
        section.style.setProperty("--reel-opacity", `${(.55 + clamp(progress / .24) * .45).toFixed(3)}`);
        section.classList.toggle("is-fullscreen", reveal > .995);
        if (status) status.textContent = reveal > .995 ? (isFrench ? "Plein écran" : "Full frame") : (isFrench ? "Faire défiler pour découvrir" : "Scroll to reveal");
    }

    function requestUpdate() {
        if (frameRequested) return;
        frameRequested = true;
        requestAnimationFrame(update);
    }

    function attemptPlayback() {
        if (video.readyState === 0) video.load();
        const promise = video.play();
        if (promise && typeof promise.catch === "function") promise.catch(() => {});
    }

    video.addEventListener("loadedmetadata", markReady);
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("playing", markReady);
    video.addEventListener("error", markError);
    video.querySelectorAll("source").forEach(source => source.addEventListener("error", markError));

    if (video.readyState >= 1) markReady();
    else video.load();

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) attemptPlayback();
            else video.pause();
        });
    }, { threshold: .01, rootMargin: "200px 0px" });
    observer.observe(section);

    ["pointerdown", "touchstart", "keydown"].forEach(eventName => {
        window.addEventListener(eventName, attemptPlayback, { once: true, passive: eventName !== "keydown" });
    });

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    reducedMotion.addEventListener("change", requestUpdate);
    requestUpdate();
})();
