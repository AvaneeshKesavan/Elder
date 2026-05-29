const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const flashMessage = document.getElementById('flashMessage');

if (dateInput && timeInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;

    dateInput.addEventListener('change', () => {
        const selectedDate = dateInput.value;
        const now = new Date();
        const selected = new Date(selectedDate);

        if (selected.toDateString() === now.toDateString()) {
            timeInput.min = now.toTimeString().slice(0, 5);
        } else {
            timeInput.min = '00:00';
        }
    });
}

if (flashMessage) {
    const errorMsg = flashMessage.dataset.error;
    const successMsg = flashMessage.dataset.success;

    if (errorMsg) {
        alert(errorMsg);
    } else if (successMsg) {
        alert(successMsg);
    }
}