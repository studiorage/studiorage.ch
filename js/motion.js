(function initMotionSystem() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const featuredStage = document.querySelector("[data-featured-stage]");
    const featuredProjects = [...document.querySelectorAll("[data-featured-project]")];
    const featuredProgress = document.querySelector(".featured-progress i");
    const servicesStage = document.querySelector("[data-services-stage]");
    const serviceChapters = [...document.querySelectorAll("[data-service-chapter]")];
    const servicesProgress = document.querySelector(".services-progress i");
    const servicesVisual = document.querySelector(".services-visual");
    const hero = document.querySelector(".hero");
    const footer = document.querySelector(".site-footer");
    let frameRequested = false;

    const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
    if (featuredStage && featuredProjects.length) {
        featuredStage.style.setProperty("--featured-scroll-height", `${Math.max(320, featuredProjects.length * 100)}vh`);
        const progressLabels = document.querySelectorAll(".featured-progress span");
        if (progressLabels.length > 1) progressLabels[progressLabels.length - 1].textContent = String(featuredProjects.length).padStart(2, "0");
    }

    function sectionProgress(element) {
        const rect = element.getBoundingClientRect();
        return clamp(-rect.top / Math.max(1, rect.height - innerHeight));
    }
    function chapterState(items, index) {
        items.forEach((item, itemIndex) => {
            item.classList.toggle("is-active", itemIndex === index);
            item.classList.toggle("is-next", itemIndex === index + 1);
            item.classList.toggle("is-previous", itemIndex === index - 1);
        });
    }
    function updateFeatured() {
        if (!featuredStage || !featuredProjects.length) return;
        if (innerWidth <= 900 || reducedMotion.matches) {
            featuredProjects.forEach(project => {
                const rect = project.getBoundingClientRect();
                const local = clamp((innerHeight - rect.top) / (innerHeight + rect.height));
                project.style.setProperty("--mobile-clip", `${Math.max(0, 26 - local * 32)}%`);
            });
            return;
        }
        const progress = sectionProgress(featuredStage);
        const scaled = progress * featuredProjects.length;
        const index = Math.min(featuredProjects.length - 1, Math.floor(scaled));
        const local = index === featuredProjects.length - 1 ? 0 : scaled - index;
        chapterState(featuredProjects, index);
        featuredProjects.forEach((project, itemIndex) => {
            if (itemIndex === index) {
                project.style.setProperty("--copy-opacity", `${clamp((.64 - local) / .14)}`);
                project.style.setProperty("--project-scale", `${1 - local * .075}`);
                project.style.setProperty("--project-y", `${-local * 5}%`);
                project.style.setProperty("--inner-y", `${-local * 2.5}%`);
                project.style.setProperty("--project-radius", `${.75 + local * .6}rem`);
                project.style.setProperty("--title-y", `${-clamp((local - .55) / .45) * 110}%`);
                project.style.setProperty("--clip-left", "0%");
            } else if (itemIndex === index + 1) {
                project.style.setProperty("--copy-opacity", `${clamp((local - .72) / .14)}`);
                project.style.setProperty("--project-scale", `${.93 + local * .07}`);
                project.style.setProperty("--project-y", `${(1 - local) * 12}%`);
                project.style.setProperty("--inner-y", `${(1 - local) * 4}%`);
                project.style.setProperty("--clip-left", `${(1 - local) * 100}%`);
                project.style.setProperty("--title-y", `${clamp((.9 - local) / .3) * 110}%`);
            } else if (itemIndex < index) {
                project.style.setProperty("--copy-opacity", "0");
                project.style.setProperty("--project-scale", ".88");
                project.style.setProperty("--project-y", "-12%");
                project.style.setProperty("--title-y", "-110%");
            } else {
                project.style.setProperty("--copy-opacity", "0");
            }
        });
        if (featuredProgress) featuredProgress.style.setProperty("--progress", `${progress * 100}%`);
    }
    function updateServices() {
        if (!servicesStage || !serviceChapters.length || innerWidth <= 900 || reducedMotion.matches) return;
        const progress = sectionProgress(servicesStage);
        const scaled = progress * serviceChapters.length;
        const index = Math.min(serviceChapters.length - 1, Math.floor(scaled));
        const local = index === serviceChapters.length - 1 ? 0 : scaled - index;
        chapterState(serviceChapters, index);
        serviceChapters.forEach((chapter, itemIndex) => {
            if (itemIndex === index) {
                chapter.style.setProperty("--service-opacity", `${clamp((.84 - local) / .2)}`);
                chapter.style.setProperty("--service-title-y", `${-clamp((local - .56) / .44) * 115}%`);
                chapter.style.setProperty("--service-list-y", `${-clamp((local - .56) / .44) * 14}%`);
            } else if (itemIndex === index + 1) {
                chapter.style.setProperty("--service-opacity", `${clamp((local - .64) / .2)}`);
                chapter.style.setProperty("--service-title-y", `${clamp((.9 - local) / .3) * 115}%`);
                chapter.style.setProperty("--service-list-y", `${clamp((.9 - local) / .3) * 22}%`);
            } else {
                chapter.style.setProperty("--service-opacity", "0");
            }
        });
        if (servicesProgress) servicesProgress.style.setProperty("--progress", `${progress * 100}%`);
        if (servicesVisual) {
            servicesVisual.style.setProperty("--visual-rotate", `${progress * 210}deg`);
            servicesVisual.style.setProperty("--visual-scale", `${.84 + progress * .22}`);
        }
    }
    function updateParallax() {
        if (reducedMotion.matches) return;
        if (hero) {
            const progress = clamp(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight));
            hero.style.setProperty("--hero-copy-y", `${progress * -11}vh`);
            hero.style.setProperty("--hero-media-y", `${progress * 7}vh`);
            hero.style.setProperty("--hero-media-scale", `${1.05 - progress * .05}`);
        }
        document.querySelectorAll(".parallax-media").forEach(wrapper => {
            const rect = wrapper.getBoundingClientRect();
            const progress = clamp((innerHeight - rect.top) / (innerHeight + rect.height));
            wrapper.style.setProperty("--parallax-y", `${(progress - .5) * 38 * Number(getComputedStyle(document.documentElement).getPropertyValue('--parallax-strength') || 1)}px`);
        });
        document.querySelectorAll(".scroll-scale").forEach(item => {
            const rect = item.getBoundingClientRect();
            const progress = clamp((innerHeight - rect.top) / (innerHeight + rect.height));
            item.style.setProperty("--scroll-scale", `${.9 + progress * .1}`);
            item.style.setProperty("--scroll-radius", `${1.6 - progress * 1.1}rem`);
        });
    }
    function updateFooter() {
        if (!footer) return;
        footer.classList.toggle("is-visible", footer.getBoundingClientRect().top < innerHeight * .86);
    }
    function update() {
        frameRequested = false;
        updateFeatured(); updateServices(); updateParallax(); updateFooter();
    }
    function requestUpdate() {
        if (frameRequested) return;
        frameRequested = true;
        requestAnimationFrame(update);
    }
    document.querySelectorAll(".cgi-media img").forEach((image, index) => {
        image.classList.add(index === 0 ? "media-reveal-x" : "media-reveal-y");
    });
    const aboutImage = document.querySelector(".about-grid img");
    if (aboutImage) aboutImage.classList.add("scroll-scale");
    document.querySelectorAll(".browser-frame, .project-card__media").forEach(item => item.classList.add("scroll-scale"));
    document.querySelectorAll(".hero__media, .cgi-media").forEach(item => item.classList.add("parallax-media"));
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    reducedMotion.addEventListener("change", requestUpdate);
    Promise.resolve(document.fonts ? document.fonts.ready : null).then(requestUpdate);
    window.addEventListener("load", requestUpdate, { once: true });
    requestUpdate();
})();
