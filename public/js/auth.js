function showForm(formType) {
    const choiceBox = document.getElementById('choice-box');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (!choiceBox || !loginForm || !registerForm) {
        return;
    }

    choiceBox.style.display = 'none';
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');

    if (formType === 'login') {
        loginForm.classList.remove('hidden');
    } else {
        registerForm.classList.remove('hidden');
    }
}

function handleRegistration() {
    const dobInput = document.getElementById('dob');
    const ageInput = document.getElementById('age');

    if (!dobInput || !ageInput) {
        return true;
    }

    const dob = dobInput.value;
    if (dob) {
        const birth = new Date(dob);
        const age = Math.floor((new Date() - birth) / (1000 * 60 * 60 * 24 * 365.25));
        ageInput.value = age;
    }

    return true;
}

function togglePassword(icon) {
    const input = icon.previousElementSibling;
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
}

window.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.querySelector('.auth-container');
    const initialForm = authContainer ? authContainer.dataset.initialForm : '';
    const dobInput = document.getElementById('dob');

    if (dobInput) {
        dobInput.max = new Date().toISOString().split('T')[0];
    }

    if (initialForm) {
        showForm(initialForm);
    }
});