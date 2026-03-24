// utils/storage.js
const storageUtils = {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  },
  
  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },
  
  async getSession(key) {
    return new Promise((resolve) => {
      chrome.storage.session.get(key, (result) => {
        resolve(result[key]);
      });
    });
  },
  
  async setSession(key, value) {
    return new Promise((resolve) => {
      chrome.storage.session.set({ [key]: value }, () => {
        resolve();
      });
    });
  }
};