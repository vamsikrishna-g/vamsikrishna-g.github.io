document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".nav-link");
    const pages = document.querySelectorAll(".page-section");
    const home = document.getElementById("home-view");

    links.forEach(link => link.addEventListener("click", event => {
        event.preventDefault();
        const id = link.dataset.page;

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
        if (id === "hyd" && window.gvkMap) window.gvkMap.invalidateSize();
    }));
});
