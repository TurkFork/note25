async function loadPartials() {
    const placeholders = document.querySelectorAll('[data-include]');

    const loads = Array.from(placeholders).map(async (placeholder) => {
        const src = placeholder.getAttribute('data-include');
        if (!src) return;

        try {
            const response = await fetch(src);
            if (!response.ok) throw new Error(`Failed to load ${src}: ${response.status}`);
            const html = await response.text();
            const template = document.createElement('template');
            template.innerHTML = html.trim();
            placeholder.replaceWith(template.content.cloneNode(true));
        } catch (error) {
            console.error(error);
        }
    });

    await Promise.all(loads);
}

document.addEventListener('DOMContentLoaded', () => {
    window.partialsReady = loadPartials();
});
