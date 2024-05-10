    // Add an event listener to the theme toggle checkbox
    document.addEventListener('DOMContentLoaded', function() {
        // Get the theme toggle checkbox
        const themeToggle = document.getElementById('themeToggle');
    
        // Check local storage for the theme checked state and update the checkbox accordingly
        const isThemeChecked = localStorage.getItem('themeChecked');
        if (isThemeChecked === 'true') {
          themeToggle.checked = true;
        }
        
        // Show the checkbox now
        themeToggle.parentElement.style.display = 'flex';
    
        // Add an event listener to the theme toggle checkbox
        themeToggle.addEventListener('change', function() {
          // Check if the checkbox is checked
          if (this.checked) {
            // If checked, store the state in local storage
            localStorage.setItem('themeChecked', 'true');
          } else {
            // If unchecked, remove the state from local storage
            localStorage.removeItem('themeChecked');
          }
        });
      });