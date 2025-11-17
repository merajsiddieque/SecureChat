import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import userIcon from "../assets/user-icon.jpg";
import List from "./List";

export default function SecureChat() {
  const [username, setUsername] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(userIcon);

  const [allUsers, setAllUsers] = useState([]); // users list
  const [userProfiles, setUserProfiles] = useState({}); // username -> image

  const [partner, setPartner] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messagesUnsubRef = useRef(null); // store unsubscribe for messages

  // -------------------------------------------------
  // Load logged-in username + profile photo
  // -------------------------------------------------
  useEffect(() => {
    const u = localStorage.getItem("username");
    setUsername(u);

    if (!u) return navigate("/auth");

    const ref = doc(db, "SecureChatAuth", u);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && snap.data().image) {
        setProfilePhoto(snap.data().image);
      } else {
        setProfilePhoto(userIcon);
      }
    });

    return unsub;
  }, [navigate]);

  // -------------------------------------------------
  // Load ALL users + profile images
  // -------------------------------------------------
  useEffect(() => {
    if (!username) return;

    const ref = collection(db, "SecureChatAuth");
    const unsub = onSnapshot(ref, (snap) => {
      const users = [];
      const photos = {};
      snap.docs.forEach((d) => {
        users.push(d.id);
        photos[d.id] = d.data().image || null;
      });
      setAllUsers(users.filter((u) => u !== username));
      setUserProfiles(photos);
    });

    return unsub;
  }, [username]);

  // -------------------------------------------------
  // AES (WebCrypto) helpers
  // -------------------------------------------------
  const textToBuf = (t) => new TextEncoder().encode(t);
  const bufToText = (b) => new TextDecoder().decode(b);
  const bufToBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const base64ToBuf = (b64) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

  async function deriveSharedKey(a, b) {
    const pair = [a || "", b || ""].sort().join(":");
    const hash = await crypto.subtle.digest("SHA-512", textToBuf(pair));
    return crypto.subtle.importKey(
      "raw",
      new Uint8Array(hash).slice(0, 32),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encrypt(text, a, b) {
    const key = await deriveSharedKey(a, b);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textToBuf(text));
    return { ciphertext: bufToBase64(enc), iv: bufToBase64(iv) };
  }

  async function decrypt(ct, iv, a, b) {
    if (!a || !b) {
      console.warn("decrypt: missing sender/receiver", { a, b });
      return "[Key Missing]";
    }
    try {
      const key = await deriveSharedKey(a, b);
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(base64ToBuf(iv)) },
        key,
        base64ToBuf(ct)
      );
      return bufToText(plain);
    } catch (err) {
      console.warn("decrypt failed for pair", { a, b, err });
      return "[Decryption Failed]";
    }
  }

  // -------------------------------------------------
  // Open chat (JUST set states) — don't load messages here
  // -------------------------------------------------
  const openChat = (receiver) => {
    if (!username) return;
    setPartner(receiver);
    setMenuOpen(false);

    const id = [username, receiver].sort().join("_");
    setChatId(id);
    // message subscription will be started by useEffect watching chatId & partner
  };

  // -------------------------------------------------
  // Subscribe to messages WHEN chatId & partner are set
  // ensures partner state is available for proper key derivation
  // -------------------------------------------------
  useEffect(() => {
    // cleanup previous subscription if any
    if (messagesUnsubRef.current) {
      try {
        messagesUnsubRef.current(); // call unsubscribe
      } catch {}
      messagesUnsubRef.current = null;
    }

    // if not ready, clear messages and return
    if (!chatId || !partner) {
      setMessages([]);
      return;
    }

    const ref = collection(db, "SecureChatMessages", chatId, "messages");
    const q = query(ref, orderBy("timestamp", "asc"));

    const unsub = onSnapshot(q, async (snap) => {
      const arr = [];
      for (const d of snap.docs) {
        const raw = d.data();
        if (raw.ciphertext && raw.iv && raw.sender && raw.receiver) {
          const text = await decrypt(raw.ciphertext, raw.iv, raw.sender, raw.receiver);
          arr.push({ id: d.id, sender: raw.sender, message: text });
        } else if (raw.message) {
          // fallback for legacy plaintext messages
          arr.push({ id: d.id, sender: raw.sender || "unknown", message: raw.message });
        }
      }
      setMessages(arr);
    });

    // store unsubscribe so we can remove it later
    messagesUnsubRef.current = unsub;

    return () => {
      if (messagesUnsubRef.current) {
        try {
          messagesUnsubRef.current();
        } catch {}
        messagesUnsubRef.current = null;
      }
    };
  }, [chatId, partner, username]);

  // -------------------------------------------------
  // Send message
  // -------------------------------------------------
  const handleSend = async () => {
    if (!input.trim() || !chatId || !partner || !username) return;

    const text = input.trim();
    setInput("");

    // immediate UI append
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender: username, message: text },
    ]);

    try {
      const enc = await encrypt(text, username, partner);
      await addDoc(collection(db, "SecureChatMessages", chatId, "messages"), {
        sender: username,
        receiver: partner,
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      // optionally show error to user
    }
  };

  // -------------------------------------------------
  // Delete chat
  // -------------------------------------------------
  const handleDeleteChat = async (id) => {
    const sure = window.confirm("⚠️ Delete entire chat permanently?");
    if (!sure) return;
    try {
      const msgsRef = collection(db, "SecureChatMessages", id, "messages");
      const snap = await getDocs(msgsRef);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      // attempt to delete parent doc (may not exist)
      try {
        await deleteDoc(doc(db, "SecureChatMessages", id));
      } catch {}
      if (chatId === id) {
        setPartner(null);
        setChatId(null);
        setMessages([]);
      }
      alert("🗑️ Chat deleted");
    } catch (err) {
      console.error("Failed to delete chat:", err);
      alert("❌ Failed to delete chat");
    }
  };

  // autoscroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/auth");
  };

  // -------------------------------------------------
  // UI
  // -------------------------------------------------
  return (
    <div className="flex h-screen bg-[#f8f8ff] text-gray-800">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-[#e9e6fc] p-5 flex flex-col justify-between shadow-md">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700 mb-6">SecureChat</h1>

          {/* USER LIST component */}
          <List
            users={allUsers}
            currentUser={username}
            selectedUser={partner}
            userProfiles={userProfiles}
            onSelect={openChat}
            onDelete={handleDeleteChat}
          />
        </div>

        {/* PROFILE DROPDOWN */}
        <div className="border-t pt-4 relative">
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-indigo-100 p-2 rounded-xl"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            <img src={profilePhoto} className="w-12 h-12 rounded-full border" alt="profile"/>
            <div>
              <p className="font-semibold">{username}</p>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>

          {menuOpen && (
            <div
              className="absolute bottom-16 left-0 bg-white border shadow-lg rounded-xl w-56 py-2 z-40"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                👤 Profile
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/help");
                }}
                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                💬 Help
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/reset-password");
                }}
                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                🔑 Reset Password
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="block w-full px-4 py-2 text-left hover:bg-red-50 text-red-600"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* CHAT WINDOW */}
      <section className="flex flex-col flex-1">
        <div className="flex-1 p-6 overflow-y-auto">
          {chatId ? (
            messages.map((m) => (
              <div
                key={m.id}
                className={`mb-3 flex ${m.sender === username ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl max-w-md ${m.sender === username ? "bg-indigo-500 text-white" : "bg-gray-200"}`}
                >
                  {m.message}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center mt-20">Select a user to start chat</p>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="p-4 border-t bg-white flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={!chatId}
            className="flex-1 border px-4 py-2 rounded-full"
            placeholder={chatId ? "Type message..." : "Select user..."}
          />

          <button
            onClick={handleSend}
            disabled={!chatId}
            className={`ml-3 px-4 py-2 rounded-full ${chatId ? "bg-indigo-500 text-white" : "bg-gray-300 text-gray-500"}`}
          >
            ➤
          </button>
        </div>
      </section>
    </div>
  );
}
