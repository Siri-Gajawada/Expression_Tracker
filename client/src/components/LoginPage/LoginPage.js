import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css"; // Link the CSS file

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:5000/login", {
        name: username,
        password: password,
      });

      const { redirectUrl } = response.data;
      if (redirectUrl) {
        // Save username in localStorage
        localStorage.setItem("username", username);
        navigate(redirectUrl);
      } else {
        alert("Invalid login response.");
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        alert("Invalid username or password");
      } else {
        console.error("Error during login:", error.message);
      }
    }
  };

  return (
    <div className="outer-container">
      {/* Semi-transparent overlay */}
      <div className="overlay"></div>

      {/* Login box */}
      <div className="login-box">
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
          {/* Input for username */}
          <div className="input-field">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Input for password */}
          <div className="input-field">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit button */}
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;