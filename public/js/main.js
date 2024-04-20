document.addEventListener('DOMContentLoaded', function() {
    // Event listener code for DOMContentLoaded event
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseover', function() {
            this.classList.add('hover');
        });
        button.addEventListener('mouseout', function() {
            this.classList.remove('hover');
        });
    });

    console.log('DOM fully loaded and parsed, interactive elements enhanced.');
});