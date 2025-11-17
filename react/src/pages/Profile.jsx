import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Profile() {
  const [username, setUsername] = useState("");
  const [photo, setPhoto] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Load current logged in user (custom auth)
  useEffect(() => {
    const loggedUser = localStorage.getItem("username");
    if (!loggedUser) {
      setMessage("❌ No user logged in.");
      setLoading(false);
      return;
    }

    setUsername(loggedUser);
    fetchProfile(loggedUser);
  }, []);

  // Fetch profile from Firestore → SecureChatAuth
  const fetchProfile = async (user) => {
    try {
      const docRef = doc(db, "SecureChatAuth", user);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        setPhoto(data.image || ""); // 🔥 Correct field name
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
    setLoading(false);
  };

  // Upload + Convert Image to Base64 (limit 1MB)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("⚠️ Image must be under 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;

      const base64SizeMB = (base64.length * 3) / 4 / 1024 / 1024;
      if (base64SizeMB > 1) {
        alert("⚠️ Converted image exceeds 1MB. Choose smaller image.");
        return;
      }

      setPhoto(base64);
    };

    reader.readAsDataURL(file);
  };

  // Save profile to Firestore → SecureChatAuth
  const handleSaveProfile = async () => {
    if (!username) return;

    try {
      const docRef = doc(db, "SecureChatAuth", username);

      await setDoc(
        docRef,
        {
          username: username,
          image: photo, // 🔥 Save Base64 image correctly
        },
        { merge: true }
      );

      setMessage("✅ Profile saved!");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Error saving profile.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-indigo-100 to-white text-gray-800">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-[90%] max-w-md text-center border border-indigo-100">
        <h1 className="text-2xl font-bold text-indigo-600 mb-6">My Profile</h1>

        {/* Profile Image */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <img
            src={
              photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"
            }
            alt="Profile"
            className="w-32 h-32 object-cover rounded-full border-4 border-indigo-300 shadow-sm"
          />

          <label
            htmlFor="photoUpload"
            className="absolute bottom-0 right-0 bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-full cursor-pointer shadow-md transition"
            title="Change Photo"
          >
            📷
          </label>

          <input
            id="photoUpload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Username (readonly) */}
        <div className="mb-6 text-left">
          <label className="block text-gray-700 mb-1 font-medium">
            Username
          </label>
          <input
            type="text"
            value={username}
            disabled
            className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveProfile}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 rounded-xl shadow-md transition"
        >
          Save Profile
        </button>

        {message && <p className="text-green-600 mt-3">{message}</p>}

        <button
          onClick={() => window.history.back()}
          className="mt-4 text-indigo-600 hover:underline text-sm"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
