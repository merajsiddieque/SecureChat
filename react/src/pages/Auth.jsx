import React, { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import crypto from "crypto-js";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState(""); 
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // SHA-512 hashing function
  function sha512(pass) {
    return crypto.SHA512(pass).toString();
  }

  // Convert image to Base64 + Check 1MB
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reject > 1MB
    if (file.size > 1024 * 1024) {
      setError("⚠️ Image must be under 1MB");
      setImage("");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  // Authenticate user
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const usernameLower = username.toLowerCase();
      const userRef = doc(db, "SecureChatAuth", usernameLower);
      const userSnap = await getDoc(userRef);

      if (isLogin) {
        // -------- LOGIN --------
        if (!userSnap.exists()) {
          setError("❌ Username does not exist.");
          return;
        }

        const data = userSnap.data();
        if (data.password !== sha512(password)) {
          setError("❌ Incorrect password.");
          return;
        }

        // Save logged-in username
        localStorage.setItem("username", usernameLower);
        navigate("/"); // Go to chatbot
      } 
      else {
        // -------- SIGNUP --------
        if (userSnap.exists()) {
          setError("⚠️ Username already taken.");
          return;
        }

        // Save user in Firestore
        await setDoc(userRef, {
          username: usernameLower,
          password: sha512(password),
          image: image || "", 
        });

        setMessage("✅ Account created! Please sign in.");
        setIsLogin(true);
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 text-gray-900">

      <div className="flex flex-1 items-center justify-center p-6 md:p-0">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl w-full max-w-md p-8 mx-2">

          <h2 className="text-3xl md:text-4xl font-bold text-indigo-700 mb-3 text-center">
            {isLogin ? "Welcome Back 👋" : "Create Account ✨"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* USERNAME */}
            <input
              type="text"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              className="w-full p-3 border border-gray-300 rounded-lg"
            />

            {/* IMAGE (Sign Up only) */}
            {!isLogin && (
              <div>
                <label className="block mb-1 font-medium text-gray-600">
                  Profile Image (Max 1MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />

                {image && (
                  <img
                    src={image}
                    alt="Preview"
                    className="w-20 h-20 rounded-full mx-auto mt-3 border shadow"
                  />
                )}
              </div>
            )}

            {/* PASSWORD */}
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg"
            />

            {/* ERRORS & MESSAGES */}
            {error && <p className="text-red-500 text-center">{error}</p>}
            {message && <p className="text-green-600 text-center">{message}</p>}

            <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
              {isLogin ? "Sign In" : "Sign Up"}
            </button>

          </form>

          {/* SWITCH FORM */}
          <div className="text-center mt-5 text-sm">
            {isLogin ? "Don't have an account?" : "Already registered?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setMessage("");
                setImage("");
              }}
              className="text-indigo-600 font-semibold"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>

          <button
            onClick={() => navigate("/")}
            className="block mx-auto mt-5 text-gray-500 hover:underline"
          >
            ← Back to SecureChat
          </button>

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden md:flex flex-1 items-center justify-center text-white p-10">
        <div className="max-w-md text-center space-y-5">
          <h1 className="text-5xl font-extrabold drop-shadow-lg">SecureChat 💬</h1>
          <p className="text-lg opacity-90">
            A peaceful, personal space to express your thoughts.
          </p>
        </div>
      </div>

    </div>
  );
}
