import localforage from 'localforage';

localforage.config({
  name: 'Jchatt',
  storeName: 'messages'
});

// Keys will be structured as: `chat_${chatId}`
// Values will be an array of message objects.

export const saveMessageLocal = async (chatId, message) => {
  const key = `chat_${chatId}`;
  try {
    let messages = await localforage.getItem(key) || [];
    
    // Check for duplicates
    if (!messages.find(m => m.id === message.id)) {
      messages.push(message);
      // Sort by timestamp just in case
      messages.sort((a, b) => a.timestamp - b.timestamp);
      await localforage.setItem(key, messages);
      return messages;
    }
    return messages;
  } catch (err) {
    console.error("Error saving message locally:", err);
    return [];
  }
};

export const saveMultipleMessagesLocal = async (chatId, newMessages) => {
  const key = `chat_${chatId}`;
  try {
    let messages = await localforage.getItem(key) || [];
    let added = false;
    
    for (const msg of newMessages) {
      if (!messages.find(m => m.id === msg.id)) {
        messages.push(msg);
        added = true;
      }
    }
    
    if (added) {
      messages.sort((a, b) => a.timestamp - b.timestamp);
      await localforage.setItem(key, messages);
    }
    return messages;
  } catch (err) {
    console.error("Error saving messages locally:", err);
    return [];
  }
};

export const getMessagesLocal = async (chatId) => {
  const key = `chat_${chatId}`;
  try {
    return await localforage.getItem(key) || [];
  } catch (err) {
    console.error("Error getting messages locally:", err);
    return [];
  }
};

export const updateMessageStatusLocal = async (chatId, messageId, status) => {
  const key = `chat_${chatId}`;
  try {
    let messages = await localforage.getItem(key) || [];
    let updated = false;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].id === messageId) {
        messages[i].status = status;
        updated = true;
        break;
      }
    }
    if (updated) {
      await localforage.setItem(key, messages);
    }
    return updated;
  } catch (err) {
    console.error("Error updating message status locally:", err);
    return false;
  }
};

export const deleteChatLocal = async (chatId) => {
  const key = `chat_${chatId}`;
  try {
    await localforage.removeItem(key);
  } catch (err) {
    console.error("Error deleting chat locally:", err);
  }
};
