document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".nav-link");
    const pages = document.querySelectorAll(".page-section");
    const home = document.getElementById("home-view");

    links.forEach(link => link.addEventListener("click", event => {
        const id = link.dataset.page;
        if (!id) return;

        event.preventDefault();

        pages.forEach(page => {
            const active = page.id === id;
            page.classList.toggle("is-active", active);
            page.setAttribute("aria-hidden", String(!active));
        });

        if (home) home.hidden = id !== "home";

        links.forEach(item => {
            const active = item === link;
            item.classList.toggle("active", active);
            if (active) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        });

        window.scrollTo(0, 0);

        if (id === "hyd" && window.refreshGVKMap) {
            window.refreshGVKMap();
        }
    }));
});
