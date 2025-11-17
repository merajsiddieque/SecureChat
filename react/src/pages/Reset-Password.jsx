import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import crypto from "crypto-js";

export default function ResetPassword() {
  const [currentUser, setCurrentUser] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [message, setMessage] = useState("");

  // SHA-512 hash
  function sha512(text) {
    return crypto.SHA512(text).toString();
  }

  // Load logged-in user from localStorage
  useEffect(() => {
    const u = localStorage.getItem("username");
    if (!u) {
      setMessage("❌ You must be logged in to reset password.");
    }
    setCurrentUser(u);
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!currentUser) {
      setMessage("❌ No user logged in.");
      return;
    }

    if (!oldPass || !newPass || !confirmPass) {
      setMessage("❌ All fields are required.");
      return;
    }

    if (newPass !== confirmPass) {
      setMessage("❌ New passwords do not match.");
      return;
    }

    try {
      const userRef = doc(db, "SecureChatAuth", currentUser);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setMessage("❌ User does not exist.");
        return;
      }

      const data = snap.data();

      // Check old password
      if (data.password !== sha512(oldPass)) {
        setMessage("❌ Old password is incorrect.");
        return;
      }

      // Update with new password
      await updateDoc(userRef, {
        password: sha512(newPass),
      });

      setMessage("✅ Password updated successfully!");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to update password.");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-100 to-indigo-100 text-gray-800 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-indigo-600 mb-4 text-center">
          Reset Password 🔒
        </h2>

        {!currentUser ? (
          <p className="text-center text-red-500">
            You are not logged in.
          </p>
        ) : (
          <p className="text-center text-gray-600 mb-6">
            Logged in as: <b>{currentUser}</b>
          </p>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          {/* OLD PASSWORD */}
          <input
            type="password"
            placeholder="Enter old password"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg"
          />

          {/* NEW PASSWORD */}
          <input
            type="password"
            placeholder="Enter new password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg"
          />

          {/* CONFIRM PASSWORD */}
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg"
          />

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Update Password
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm">{message}</p>
        )}

        <button
          onClick={() => window.history.back()}
          className="block w-full text-center text-gray-500 mt-6 hover:underline"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
