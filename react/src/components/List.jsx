import React from "react";
import userIcon from "../assets/user-icon.jpg";

function List({ 
  users = [],          // array of usernames
  currentUser,         // logged in user
  selectedUser,        // currently selected partner
  onSelect,            // function(username)
  onDelete,            // function(chatId)
  userProfiles = {}    // object: { username: photoBase64 }
}) 
{
  return (
    <div className="space-y-2">
      {users.map((u) => {
        if (u === currentUser) return null;

        const chatId = [currentUser, u].sort().join("_");
        const photo = userProfiles[u] || userIcon;

        return (
          <div
            key={u}
            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer
              ${selectedUser === u ? "bg-indigo-500 text-white" : "bg-white"}
            `}
          >
            {/* USER BUTTON */}
            <button
              onClick={() => onSelect(u)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <img
                src={photo}
                className="w-10 h-10 rounded-full border object-cover"
                alt="Profile"
              />
              <span className="font-medium">{u}</span>
            </button>

            {/* DELETE BUTTON */}
            <button
              onClick={() => onDelete(chatId)}
              className="text-red-600 hover:text-red-800 font-bold px-2"
              title="Delete this chat"
            >
              ⛔
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default List;
