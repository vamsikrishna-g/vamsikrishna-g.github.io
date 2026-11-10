document.addEventListener("DOMContentLoaded", () => {
    const target = document.getElementById("typing");
    if (!target) return;

    const words = ["Vamsi’s", "GVK"];
    let word = 0, char = 0, erase = false;

    function type() {
        const current = words[word];
        char += erase ? -1 : 1;
        target.textContent = current.slice(0, char);

        let delay = erase ? 110 : 180;
        if (!erase && char === current.length) { erase = true; delay = 1100; }
        else if (erase && char === 0) { erase = false; word = (word + 1) % words.length; delay = 450; }
        setTimeout(type, delay);
    }
    type();
});
