

const tabs = document.querySelectorAll('#tabHeaders');

tabs.addEventListener("click", function(e) {
    e.preventDefault();

    console.log(e)
})


const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', function (e) {
        e.preventDefault();
        
        // Remove active class and `aria-current` from all tabs
        tabs.forEach(innerTab => {
            innerTab.classList.remove('text-blue-600', 'border-blue-600', 'dark:text-blue-500', 'dark:border-blue-500');
            innerTab.classList.add('border-transparent');
            innerTab.removeAttribute('aria-current');
        });
        
        // Add active class and `aria-current` to clicked tab
        tab.classList.add('text-blue-600', 'border-blue-600', 'dark:text-blue-500', 'dark:border-blue-500');
        tab.classList.remove('border-transparent');
        tab.setAttribute('aria-current', 'page');
        
        // Hide all tab contents
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });
        
        // Show current tab content
        const target = document.getElementById(tab.getAttribute('data-target'));
        if (target) {
            target.classList.remove('hidden');
        }
    });
});
