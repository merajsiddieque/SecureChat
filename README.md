# 🔐 SecureChat

SecureChat is a **secure real-time chat application** built using **React** and **Firebase Firestore**, where messages are encrypted using **AES‑GCM encryption** and user passwords are protected using **SHA‑512 hashing**.

This project focuses on implementing **secure messaging, authentication, and profile management** using modern web technologies.

---

# 🚀 Features

## 🔑 Authentication

- User Signup and Login
- Password stored using **SHA‑512 hashing**
- Password Reset functionality
- Session stored using **LocalStorage**

## 💬 Secure Messaging

- Real‑time chat using **Firebase Firestore**
- Messages encrypted using **AES‑GCM**
- Unique encryption key generated per chat using **SHA‑512**
- Automatic message decryption on receiver side

## 👤 Profile Management

- Upload profile photo
- Profile image stored in Firebase (**Base64**)
- Update profile anytime

## 🗑️ Chat Features

- View all users
- Select user and start chat
- Delete entire chat
- Auto scroll messages

---

# 🔒 Security Implementation

## Password Security

Passwords are **never stored in plain text**.

They are hashed using:

```js
crypto.SHA512(password).toString()
```

Stored in Firestore collection:

```
SecureChatAuth
```

---

## Message Encryption

Messages are encrypted using:

**AES‑GCM (Web Crypto API)**

Encryption flow:

```
Message → Encrypt → Store in Firestore
Firestore → Decrypt → Display Message
```

Encryption key is derived using:

```
SHA‑512(username1 : username2)
```

---

# 🛠️ Tech Stack

## Frontend

- React JS
- React Router
- Tailwind CSS

## Backend / Database

- Firebase Firestore

## Security

- Crypto‑JS
- SHA‑512
- Web Crypto API (AES‑GCM)

---

# 📂 Project Structure

```
SecureChat
│
├── src
│   ├── components
│   │      SecureChat.jsx
│   │      List.jsx
│   │
│   ├── pages
│   │      Auth.jsx
│   │      Profile.jsx
│   │      ResetPassword.jsx
│   │      Help.jsx
│   │
│   ├── firebase.js
│   ├── App.jsx
│   └── main.jsx
│
└── README.md
```

---

# ⚙️ Installation

## 1. Clone repository

```bash
git clone https://github.com/merajsiddieque/SecureChat.git
```

## 2. Open folder

```bash
cd SecureChat
```

## 3. Install dependencies

```bash
npm install
```

## 4. Add Firebase config

Create file:

```
firebase.js
```

Add your Firebase config:

```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // your config
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
```

## 5. Run project

```bash
npm run dev
```

---

# 🔥 Firebase Database Structure

## SecureChatAuth

Stores users

**Fields:**

- username
- password (SHA‑512)
- image

---

## SecureChatMessages

Stores chats

**Structure:**

```
chatId
   messages
      sender
      receiver
      ciphertext
      iv
      timestamp
```

---

# 🎯 Purpose of Project

This project was built to learn:

- Secure authentication
- Encryption implementation
- Firebase Firestore
- React real‑time applications

---

# 👨‍💻 Author

**Meraj Alam Siddique**

GitHub:

https://github.com/merajsiddieque

---

# ⭐ Support

If you like this project, please give it a ⭐ on GitHub!
