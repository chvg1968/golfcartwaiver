document.getElementById('waiverForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    let isValid = true;
    const inputs = this.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        if (!input.value) {
            isValid = false;
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    });

    if (!document.getElementById('ageConfirmation').checked) {
        isValid = false;
        document.getElementById('ageConfirmation').classList.add('error');
    }

    if (isValid) {
        alert('Form submitted successfully!');
        this.reset();
    } else {
        alert('Please fill in all required fields.');
    }
});