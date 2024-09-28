document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const switchToSignup = document.getElementById('switch-to-signup');
  const switchToLogin = document.getElementById('switch-to-login');

  switchToSignup.addEventListener('click', function (event) {
    event.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  });

  switchToLogin.addEventListener('click', function (event) {
    event.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  // Function to send data to server
  async function sendData(url, data, url2) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const responseData = await response.json();

      if (responseData.message === "Successful") {
        window.location.href = url2;
      } else {
        alert('Login failed. Please check your email and password.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred during login. Please try again.');
    }
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const formData = {
      email: email,
      password: password
    };

    const url = 'http://localhost:3000/login'; // Update the URL to match your server-side login route
    const url2 = 'http://localhost:5500/weather-main/index.html';
    sendData(url, formData, url2);
  });

  signupForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const formData = {
      username: username,
      email: email,
      password: password
    };

    const url = 'http://localhost:3000/signup'; // Update the URL to match your server-side login route
    const url2 = 'http://localhost:5500/weather-main/lo.html';
    sendData(url, formData, url2);
  });


});
