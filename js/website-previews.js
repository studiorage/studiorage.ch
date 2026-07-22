(function initWebsitePreviews() {
    const stage = document.querySelector(".website-stage");
    const projects = [...document.querySelectorAll(".website-project")];
    const indicators = [...document.querySelectorAll(".website-progress span")];
    const desktopQuery = window.matchMedia("(min-width: 901px)");

    if (!stage || !projects.length) return;

    stage.style.setProperty("--website-count", String(projects.length));
    stage.style.setProperty("--website-scroll-height", `${projects.length * 100}svh`);

    projects.forEach((project) => {
        const iframe = project.querySelector(".browser-frame__live");
        const viewport = project.querySelector(".browser-frame__viewport");
        if (!iframe || !viewport) return;

        const markLoaded = () => viewport.classList.add("is-loaded");
        iframe.addEventListener("load", markLoaded, { once: true });

        // The first preview is eager; later previews retain native lazy loading.
    });

    let frameRequested = false;

    function setProjectInteractive(project, isInteractive) {
        project.inert = !isInteractive;
        project.querySelectorAll("a, button, iframe, input, select, textarea, [tabindex]").forEach((element) => {
            if (isInteractive) {
                if (element.dataset.previewTabindex !== undefined) {
                    const previous = element.dataset.previewTabindex;
                    if (previous === "") element.removeAttribute("tabindex");
                    else element.setAttribute("tabindex", previous);
                    delete element.dataset.previewTabindex;
                }
            } else if (element.dataset.previewTabindex === undefined) {
                element.dataset.previewTabindex = element.getAttribute("tabindex") || "";
                element.setAttribute("tabindex", "-1");
            }
        });
    }

    function resetForStackedLayout() {
        projects.forEach((project) => {
            project.classList.add("is-active");
            project.classList.remove("is-next", "is-previous");
            project.style.removeProperty("opacity");
            project.style.removeProperty("transform");
            project.style.removeProperty("z-index");
            project.style.removeProperty("pointer-events");
            project.removeAttribute("aria-hidden");
            setProjectInteractive(project, true);
        });
    }

    function update() {
        frameRequested = false;

        if (!desktopQuery.matches) {
            resetForStackedLayout();
            return;
        }

        const rect = stage.getBoundingClientRect();
        const distance = Math.max(1, stage.offsetHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -rect.top / distance));
        const lastIndex = projects.length - 1;
        const scaled = progress * lastIndex;
        const lowerIndex = Math.min(lastIndex, Math.floor(scaled));
        const localProgress = lowerIndex === lastIndex ? 0 : scaled - lowerIndex;
        const activeIndex = Math.min(lastIndex, Math.round(scaled));

        projects.forEach((project, index) => {
            const isLower = index === lowerIndex;
            const isUpper = index === lowerIndex + 1;
            const isActive = index === activeIndex;

            project.classList.toggle("is-active", isActive);
            project.classList.toggle("is-previous", index === activeIndex - 1);
            project.classList.toggle("is-next", index === activeIndex + 1);
            project.style.pointerEvents = isActive ? "auto" : "none";
            project.setAttribute("aria-hidden", isActive ? "false" : "true");
            setProjectInteractive(project, isActive);

            if (isLower) {
                project.style.opacity = String(1 - localProgress);
                project.style.transform = `translate3d(0,${localProgress * -3.5}rem,0) scale(${1 - localProgress * 0.035})`;
                project.style.zIndex = "2";
            } else if (isUpper) {
                project.style.opacity = String(localProgress);
                project.style.transform = `translate3d(0,${(1 - localProgress) * 3.5}rem,0) scale(${0.965 + localProgress * 0.035})`;
                project.style.zIndex = "3";
            } else {
                project.style.opacity = "0";
                project.style.transform = index < lowerIndex
                    ? "translate3d(0,-3.5rem,0) scale(.965)"
                    : "translate3d(0,3.5rem,0) scale(.965)";
                project.style.zIndex = "1";
            }
        });

        indicators.forEach((indicator, index) => {
            indicator.classList.toggle("is-active", index === activeIndex);
        });
    }

    function requestUpdate() {
        if (frameRequested) return;
        frameRequested = true;
        requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    desktopQuery.addEventListener?.("change", requestUpdate);
    update();
})();
