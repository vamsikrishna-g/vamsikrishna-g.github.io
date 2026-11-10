document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".nav-link");
    const pages = document.querySelectorAll(".page-section");
    const home = document.getElementById("home-view");

    function refreshMapSize() {
        if (!window.gvkMap) return;

        // Wait until the Hydrology section has been displayed and laid out.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.gvkMap.invalidateSize({ pan: false });
            });
        });
    }

    links.forEach(link => link.addEventListener("click", event => {
        const id = link.dataset.page;

        // Mail links are not page-navigation controls.
        if (!id) return;

        event.preventDefault();

        pages.forEach(page => {
            const active = page.id === id;
            page.classList.toggle("is-active", active);
            page.setAttribute("aria-hidden", String(!active));
        });
        home.hidden = id !== "home";

        links.forEach(item => {
            const active = item === link;
            item.classList.toggle("active", active);
            active ? item.setAttribute("aria-current", "page") : item.removeAttribute("aria-current");
        });

        window.scrollTo(0, 0);

        if (id === "hyd") {
            if (window.initGVKMap) window.initGVKMap();
            refreshMapSize();
        }
    }));
});
