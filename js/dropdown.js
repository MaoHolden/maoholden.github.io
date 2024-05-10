let dropDown = document.querySelector('.dropdown');
let dropDownContent = document.querySelector('.dropdown-content');

// Event listener para el botón de activación
dropDown.addEventListener('click', (event) => {
    event.stopPropagation(); // Evita que el evento se propague al documento
    if (dropDownContent.style.visibility === 'visible') {
        hideDropDown();
    } else {
        showDropDown();
    }
});

// Event listener para el documento
document.addEventListener('click', (event) => {
    const isDropDownClicked = dropDown.contains(event.target);
    const isDropDownContentClicked = dropDownContent.contains(event.target);
    if (!isDropDownClicked && !isDropDownContentClicked) {
        hideDropDown();
    }
});

function showDropDown() {
    dropDownContent.style.visibility = 'visible';
    dropDownContent.style.opacity = 1;
    document.body.style.overflowY = 'hidden'; // Deshabilitar scroll
}

function hideDropDown() {
    dropDownContent.style.visibility = 'hidden';
    dropDownContent.style.opacity = 0;
    document.body.style.overflowY = 'auto'; // Habilitar scroll
}

// Event listener for window resize
window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) { // Example breakpoint for when the second menu shows up
        hideDropDown();
    }
});