// Add items as { type: "journal"|"conference", text: "...", url: "..." }.
const publications = [];

function renderPublications(filter = "all") {
    const list = document.getElementById("publication-list");
    const items = publications.filter(p => filter === "all" || p.type === filter);
    list.replaceChildren();

    if (!items.length) {
        const li = document.createElement("li");
        li.textContent = "Publication details can be added in js_files/publication.js.";
        list.append(li);
        return;
    }

    items.forEach(item => {
        const li = document.createElement("li");
        if (item.url) {
            const link = document.createElement("a");
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = item.text;
            li.append(link);
        } else li.textContent = item.text;
        list.append(li);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderPublications();
    document.querySelectorAll(".filter-button").forEach(button =>
        button.addEventListener("click", () => {
            document.querySelector(".filter-button.active")?.classList.remove("active");
            button.classList.add("active");
            renderPublications(button.dataset.filter);
        })
    );
});
