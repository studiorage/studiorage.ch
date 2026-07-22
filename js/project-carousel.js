(function initProjectCarousel() {
    const modal = document.getElementById("project-carousel");
    const isFrench = document.documentElement.lang.toLowerCase().startsWith("fr");
    const projects = window.STUDIO_RAGE_PROJECTS;
    if (!modal || !projects) return;

    const scroller = modal.querySelector(".project-carousel__scroller");
    const scrollSpace = modal.querySelector(".project-carousel__scroll-space");
    const track = modal.querySelector(".project-carousel__track");
    const closeButton = modal.querySelector(".project-carousel__close");
    const previousButton = modal.querySelector(".project-carousel__previous");
    const nextButton = modal.querySelector(".project-carousel__next");
    const title = modal.querySelector("#project-carousel-title");
    const description = modal.querySelector(".project-carousel__description");
    const current = modal.querySelector(".project-carousel__current");
    const total = modal.querySelector(".project-carousel__total");

    let activeProject = null;
    let slides = [];
    let activeIndex = 0;
    let maximumX = 0;
    let scrollDistance = 1;
    let homepageScroll = 0;
    let returnFocus = null;
    let frameRequested = false;

    const pad = number => String(number).padStart(2, "0");
    const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

    let previousBodyStyles = null;

    function lockPage() {
        homepageScroll = window.scrollY || window.pageYOffset || 0;
        previousBodyStyles = {
            position: document.body.style.position,
            top: document.body.style.top,
            left: document.body.style.left,
            right: document.body.style.right,
            width: document.body.style.width,
            paddingRight: document.body.style.paddingRight
        };

        const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        document.documentElement.classList.add("project-carousel-open");
        document.body.style.position = "fixed";
        document.body.style.top = `${-homepageScroll}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
        if (scrollbarWidth) document.body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.classList.add("is-locked");
    }

    function unlockPage() {
        const root = document.documentElement;
        const previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";

        document.body.style.position = previousBodyStyles?.position || "";
        document.body.style.top = previousBodyStyles?.top || "";
        document.body.style.left = previousBodyStyles?.left || "";
        document.body.style.right = previousBodyStyles?.right || "";
        document.body.style.width = previousBodyStyles?.width || "";
        document.body.style.paddingRight = previousBodyStyles?.paddingRight || "";
        document.body.classList.remove("is-locked");
        root.classList.remove("project-carousel-open");

        window.scrollTo({ top: homepageScroll, left: 0, behavior: "auto" });
        requestAnimationFrame(() => {
            root.style.scrollBehavior = previousScrollBehavior;
        });
        previousBodyStyles = null;
    }

    function applySourceRatio(media, figure) {
        const width = media.videoWidth || media.naturalWidth;
        const height = media.videoHeight || media.naturalHeight;
        if (!width || !height) return;

        const ratio = Math.max(.35, Math.min(3.2, width / height));
        const verticalPadding = window.innerWidth <= 700 ? 13 * 16 : 15 * 16;
        const usableHeight = Math.max(260, window.innerHeight - verticalPadding);
        const maximumWidth = window.innerWidth * (window.innerWidth <= 700 ? .94 : .92);
        const calculatedWidth = Math.min(maximumWidth, usableHeight * ratio);

        figure.style.setProperty("--slide-width", `${Math.max(220, calculatedWidth)}px`);
        figure.style.setProperty("--slide-ratio", String(ratio));
        figure.classList.toggle("is-portrait", ratio < 1);
        figure.classList.toggle("is-landscape", ratio >= 1);

        if (modal.classList.contains("is-open")) measure(true);
    }

    function createSlide(item, projectTitle, index, count) {
        const figure = document.createElement("figure");
        figure.className = "project-carousel__slide";
        figure.setAttribute("role", "group");
        figure.setAttribute("aria-label", isFrench ? `${projectTitle}, image ${index + 1} sur ${count}` : `${projectTitle}, image ${index + 1} of ${count}`);
        
        let media;
        if (item.type === "video") {
            media = document.createElement("video");
            media.src = item.src;
            media.muted = true;
            media.loop = true;
            media.playsInline = true;
            media.preload = "metadata";
            if (item.poster) media.poster = item.poster;
            media.setAttribute("aria-label", isFrench ? `${projectTitle}, animation` : `${projectTitle} motion`);
            media.addEventListener("loadedmetadata", () => applySourceRatio(media, figure), { once: true });
        } else {
            media = document.createElement("img");
            media.src = item.src;
            media.alt = `${projectTitle} project image`;
            media.loading = index === 0 ? "eager" : "lazy";
            media.decoding = "async";
            media.addEventListener("load", () => applySourceRatio(media, figure), { once: true });
        }
        figure.append(media);
        if (media.complete) applySourceRatio(media, figure);
        return figure;
    }

    function build(project) {
        const mediaItems = [
            { type: "image", src: project.cover, caption: isFrench ? "Image principale du projet" : "Project cover" },
            ...(project.media || [])
        ];
        track.replaceChildren(...mediaItems.map((item, index) => createSlide(item, project.title, index, mediaItems.length)));
        slides = [...track.querySelectorAll(".project-carousel__slide")];
        title.textContent = project.title;
        description.replaceChildren();
        if (project.description) description.append(document.createTextNode(project.description));
        if (project.credit) {
            if (project.description) description.append(document.createTextNode(" "));
            description.append(document.createTextNode(project.credit.prefix || ""));
            const creditLink = document.createElement("a");
            creditLink.href = project.credit.url;
            creditLink.target = "_blank";
            creditLink.rel = "noopener noreferrer";
            creditLink.textContent = project.credit.label;
            description.append(creditLink, document.createTextNode("."));
        }
        total.textContent = pad(slides.length);
        activeIndex = 0;
        updateMetadata(0);
    }

    function measure(preserveProgress = false) {
        if (!modal.classList.contains("is-open")) return;
        const oldMaximum = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
        const oldProgress = preserveProgress ? scroller.scrollTop / oldMaximum : 0;
        maximumX = Math.max(0, track.scrollWidth - window.innerWidth);
        scrollDistance = Math.max(1, maximumX * 1.05);
        scrollSpace.style.setProperty("--carousel-scroll-height", `${window.innerHeight + scrollDistance}px`);
        requestAnimationFrame(() => {
            const maximumScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
            scroller.scrollTop = oldProgress * maximumScroll;
            update();
        });
    }

    function updateMetadata(index) {
        const safeIndex = Math.max(0, Math.min(slides.length - 1, index));
        activeIndex = safeIndex;
        current.textContent = pad(safeIndex + 1);
        slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === safeIndex));
        slides.forEach((slide, slideIndex) => {
            const video = slide.querySelector("video");
            if (!video) return;
            if (slideIndex === safeIndex) video.play().catch(() => {});
            else video.pause();
        });
    }

    function update() {
        frameRequested = false;
        const maximumScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
        const progress = clamp(scroller.scrollTop / maximumScroll);
        const x = maximumX * progress;
        track.style.setProperty("--carousel-x", `${-x}px`);
        modal.style.setProperty("--carousel-progress", `${progress * 100}%`);
        updateMetadata(Math.round(progress * Math.max(0, slides.length - 1)));
    }

    function requestUpdate() {
        if (frameRequested) return;
        frameRequested = true;
        requestAnimationFrame(update);
    }

    function goTo(index) {
        if (!slides.length) return;
        const target = Math.max(0, Math.min(slides.length - 1, index));
        const maximumScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
        const progress = slides.length === 1 ? 0 : target / (slides.length - 1);
        scroller.scrollTo({ top: maximumScroll * progress, behavior: "smooth" });
    }

    function open(projectSlug, trigger) {
        const project = projects[projectSlug];
        if (!project) return;
        activeProject = projectSlug;
        returnFocus = trigger || document.activeElement;
        build(project);
        lockPage();
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        scroller.scrollTop = 0;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            measure(false);
            closeButton.focus({ preventScroll: true });
        }));
    }

    function close() {
        if (!activeProject) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        slides.forEach(slide => slide.querySelector("video")?.pause());
        activeProject = null;
        window.setTimeout(() => {
            track.replaceChildren();
            slides = [];
            unlockPage();
            if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
        }, 360);
    }

    function handleKeydown(event) {
        if (!modal.classList.contains("is-open")) return;
        if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            goTo(activeIndex + 1);
            return;
        }
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(activeIndex - 1);
            return;
        }
        if (event.key !== "Tab") return;
        const focusable = [closeButton, previousButton, nextButton].filter(button => getComputedStyle(button).display !== "none");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    window.addEventListener("resize", () => {
        slides.forEach(slide => {
            const media = slide.querySelector("img, video");
            if (media) applySourceRatio(media, slide);
        });
    }, { passive: true });

    document.querySelectorAll(".project-carousel-open").forEach(trigger => {
        trigger.addEventListener("click", () => open(trigger.dataset.project, trigger));
    });
    closeButton.addEventListener("click", close);
    previousButton.addEventListener("click", () => goTo(activeIndex - 1));
    nextButton.addEventListener("click", () => goTo(activeIndex + 1));
    scroller.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", () => measure(true), { passive: true });
    modal.addEventListener("keydown", handleKeydown);
})();
