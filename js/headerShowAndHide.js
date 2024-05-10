    // JavaScript to handle header show/hide on scroll
    let lastScrollTop = 0;
    const header = document.querySelector('.header');

    window.addEventListener('scroll', () => {
      let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

      if (currentScroll > lastScrollTop) {
        // Scroll down
        header.classList.remove('show');
      } else {
        // Scroll up
        header.classList.add('show');
      }

      lastScrollTop = currentScroll;
    });