const DB_NAME = 'pwa-sync-db';
const DB_VERSION = 1;
const STORE_NAME = 'activities';

/**
 * Opens the IndexedDB database connection and creates the object store if needed.
 */
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

/**
 * Adds a new activity to IndexedDB with a 'pending' sync status.
 */
export const addActivity = async (activity) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({
      ...activity,
      status: 'pending',
      timestamp: activity.timestamp || new Date().toISOString()
    });

    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Retrieves all activities stored in IndexedDB.
 */
export const getActivities = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Deletes an activity by its ID.
 */
export const deleteActivity = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Clears all activities from the database.
 */
export const clearActivities = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Updates the sync status (e.g. 'pending' -> 'synced') of a specific activity.
 */
export const updateActivityStatus = async (id, status) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.status = status;
        const putRequest = store.put(record);
        
        putRequest.onsuccess = () => {
          resolve();
        };
        
        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      } else {
        reject(new Error('Record not found'));
      }
    };
    
    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
};
