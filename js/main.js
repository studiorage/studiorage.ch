(function initSite() {
    document.querySelectorAll("[data-current-year]").forEach(node => {
        node.textContent = new Date().getFullYear();
    });

    const autoplayVideos = [...document.querySelectorAll("video[data-autoplay], video[autoplay]")];
    if (!autoplayVideos.length) return;

    const visibleVideos = new Set();

    function prepareVideo(video) {
        // Playback is controlled exclusively by the observer below. Removing
        // native autoplay prevents off-screen videos from decoding at startup.
        video.autoplay = false;
        video.removeAttribute("autoplay");
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute("muted", "");
        video.setAttribute("loop", "");
        video.setAttribute("playsinline", "");
    }

    function playVideo(video) {
        if (document.visibilityState === "hidden") return;
        if (video.readyState === 0) video.load();
        const promise = video.play();
        if (promise && typeof promise.catch === "function") promise.catch(() => {});
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                visibleVideos.add(video);
                playVideo(video);
            } else {
                visibleVideos.delete(video);
                video.pause();
            }
        });
    }, {
        threshold: 0.01,
        rootMargin: "160px 0px"
    });

    autoplayVideos.forEach(video => {
        prepareVideo(video);
        observer.observe(video);
        ["loadedmetadata", "loadeddata", "canplay"].forEach(eventName => {
            video.addEventListener(eventName, () => {
                if (visibleVideos.has(video)) playVideo(video);
            });
        });
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            autoplayVideos.forEach(video => video.pause());
        } else {
            visibleVideos.forEach(playVideo);
        }
    });

    function retryVisibleVideos() {
        visibleVideos.forEach(playVideo);
    }

    ["pointerdown", "touchstart", "keydown"].forEach(eventName => {
        window.addEventListener(eventName, retryVisibleVideos, {
            passive: eventName !== "keydown"
        });
    });
})();
