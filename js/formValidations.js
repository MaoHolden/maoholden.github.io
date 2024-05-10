const d = document;

function contactFormValidations () {
    const $form = d.querySelector('.contact-form'),
    $inputs = d.querySelectorAll('.contact-form [required]');

    $inputs.forEach((input) => {
        const $span = d.createElement('span');
        $span.id = input.name;
        $span.textContent = input.title;
        $span.classList.add('contact-form-error', 'none');
        input.insertAdjacentElement("afterend", $span);
    });

    d.addEventListener('keyup', (e) => {
        if (e.target.matches('.contact-form [required]')) {
            let $input = e.target;
            pattern = $input.pattern || $input.dataset.pattern;
            console.log(pattern);

            if (pattern && $input.value !== '') {
                let regex = new RegExp(pattern)
                return !regex.exec($input.value) 
                ? d.getElementById($input.name).classList.add('is-active')
                : d.getElementById($input.name).classList.remove('is-active')
            }

            if (!pattern) {
                console.log('input hasn´t pattern');
                return $input.value === ''
                ? d.getElementById($input.name).classList.add('is-active')
                : d.getElementById($input.name).classList.remove('is-active')
            }
        }
    }); 

    d.addEventListener('submit', (e) => {
        e.preventDefault();

        const $loader = d.querySelector('.loader'),
        $response = d.querySelector('.contact-form-response');
        $loader.classList.remove('none');

        // Create an empty object to store extracted data
        let formDataObj = {};
        const formData = new FormData(e.target)

        // Iterate over formData entries
        for (let pair of formData.entries()) {
            formDataObj[pair[0]] = pair[1];
        }

        fetch('https://formsubmit.co/ajax/marsgeeks@gmail.com', {
            // Replace naked email:
            // 4310788d25178bbf565a3baf874ee5c3
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formDataObj),
            })
            .then((res) => (res.ok ? res.json() : Promise.reject(res)))
            .then((json) => {
              $loader.classList.add('none');
              $response.innerHtml = `<p>${json.message}</p>`;
              $form.reset();
            })
            .catch((err) => {
              let message =
                err.statusText || `An error occurred while sending. Please try again.`;
                $response.innerHTML = `<p>Error ${err.status}: ${message}`;
            })
            .finally(() => {
              $loader.classList.add('none');
              $response.classList.remove('none');
              setTimeout(() => {
                $form.reset();
                setTimeout(() => $response.classList.add('none'), 3000);
              }, 3000);
            });
    });
}

d.addEventListener('DOMContentLoaded', () => {
    contactFormValidations();
});


